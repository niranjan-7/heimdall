import { spawn, ChildProcess } from 'child_process'
import * as net from 'net'
import * as fs from 'fs'
import { Series, Episode, Movie } from '../../shared/types'
import { StorageService } from '../storageService'
import { SyncWorker } from '../syncWorker'
import { IMediaPlayerDriver, LaunchResult } from './types'

export class MpvDriver implements IMediaPlayerDriver {
  public readonly playerType = 'mpv' as const
  private currentProcess: ChildProcess | null = null
  private socket: net.Socket | null = null
  private socketBuffer = ''
  private storageService: StorageService
  private syncWorker: SyncWorker
  private currentSubDelay = 0

  private lastTimePos = 0
  private lastDuration = 0
  private isPaused = false
  private currentFilePath = ''

  constructor(storageService: StorageService, syncWorker: SyncWorker) {
    this.storageService = storageService
    this.syncWorker = syncWorker
  }

  public isRunning(): boolean {
    return this.currentProcess !== null && !this.currentProcess.killed
  }

  public getPipePath(): string {
    return process.platform === 'win32' ? '\\\\.\\pipe\\heimdall-mpv' : '/tmp/heimdall-mpv'
  }

  public async setSubtitleDelay(delaySec: number): Promise<boolean> {
    this.currentSubDelay = delaySec
    if (!this.socket || this.socket.destroyed) return true

    try {
      const cmd = JSON.stringify({ command: ['set_property', 'sub-delay', delaySec] }) + '\n'
      this.socket.write(cmd)
      return true
    } catch {
      return false
    }
  }

  public getSubtitleDelay(): number {
    return this.currentSubDelay
  }

  public async togglePause(): Promise<boolean> {
    if (!this.socket || this.socket.destroyed) return false
    try {
      this.socket.write(JSON.stringify({ command: ['cycle', 'pause'] }) + '\n')
      return true
    } catch {
      return false
    }
  }

  public async seek(timeSec: number): Promise<boolean> {
    if (!this.socket || this.socket.destroyed) return false
    try {
      this.socket.write(JSON.stringify({ command: ['seek', Math.floor(timeSec), 'absolute'] }) + '\n')
      return true
    } catch {
      return false
    }
  }

  public async stop(): Promise<void> {
    if (this.socket && !this.socket.destroyed) {
      try {
        const quitCmd = JSON.stringify({ command: ['quit'] }) + '\n'
        this.socket.write(quitCmd)
      } catch {
        // ignore
      }
      this.socket.destroy()
      this.socket = null
    }

    if (this.currentProcess) {
      try {
        this.currentProcess.kill('SIGTERM')
      } catch {
        // ignore
      }
      this.currentProcess = null
    }

    this.socketBuffer = ''
    this.currentSubDelay = 0
    this.lastTimePos = 0
    this.lastDuration = 0
    this.isPaused = false
    this.currentFilePath = ''
  }

  private buildMpvArgs(
    playlistPaths: string[],
    startTime: number,
    subDelay: number
  ): string[] {
    const settings = this.storageService.getSettings()
    const pipePath = this.getPipePath()

    const args = [
      `--input-ipc-server=${pipePath}`,
      '--idle=no',
      '--keep-open=no',
      '--reset-on-next-file=start'
    ]

    if (subDelay !== 0) {
      args.push(`--sub-delay=${subDelay}`)
    }

    // High quality scaling & Anime4K profile presets
    if (settings.enableAnime4K) {
      if (settings.anime4kPreset === 'fast') {
        args.push('--hwdec=auto-safe', '--profile=fast')
      } else {
        // 'hq_lanczos' (default) or 'anime4k'
        args.push(
          '--profile=gpu-hq',
          '--scale=ewa_lanczossharp',
          '--cscale=ewa_lanczossharp',
          '--dscale=mitchell',
          '--correct-downscaling=yes',
          '--linear-downscaling=yes',
          '--hwdec=auto-safe'
        )
      }
    }

    // User-defined custom flags
    if (settings.mpvCustomArgs && settings.mpvCustomArgs.trim()) {
      const customTokens = settings.mpvCustomArgs.trim().split(/\s+/)
      args.push(...customTokens)
    }

    if (startTime > 0 && playlistPaths.length > 0) {
      // Per-file option scope in mpv: only the first file starts at startTime
      args.push(
        '--{',
        `--start=${Math.max(0, Math.floor(startTime))}`,
        playlistPaths[0],
        '--}',
        ...playlistPaths.slice(1)
      )
    } else {
      args.push(...playlistPaths)
    }
    return args
  }

  private async connectIpc(pipePath: string, maxAttempts = 30): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (!this.currentProcess || this.currentProcess.killed) return false

      try {
        await new Promise((resolve) => setTimeout(resolve, 100))
        const client = net.createConnection(pipePath)

        await new Promise<void>((resolve, reject) => {
          client.once('connect', () => {
            this.socket = client
            this.setupSocket(client)
            resolve()
          })
          client.once('error', (err) => {
            client.destroy()
            reject(err)
          })
        })

        return true
      } catch {
        // MPV IPC pipe not yet listening, continue retry
      }
    }
    return false
  }

  private setupSocket(socket: net.Socket): void {
    this.socketBuffer = ''

    // Register property observers for push events (0ms latency)
    const observers = [
      { command: ['observe_property', 1, 'time-pos'] },
      { command: ['observe_property', 2, 'duration'] },
      { command: ['observe_property', 3, 'pause'] },
      { command: ['observe_property', 4, 'path'] },
      { command: ['observe_property', 5, 'sub-delay'] }
    ]

    for (const obs of observers) {
      socket.write(JSON.stringify(obs) + '\n')
    }

    socket.on('data', (chunk) => {
      this.socketBuffer += chunk.toString('utf-8')
      let newlineIndex: number
      while ((newlineIndex = this.socketBuffer.indexOf('\n')) !== -1) {
        const line = this.socketBuffer.substring(0, newlineIndex).trim()
        this.socketBuffer = this.socketBuffer.substring(newlineIndex + 1)
        if (line) {
          try {
            const parsed = JSON.parse(line)
            this.handleIpcEvent(parsed)
          } catch {
            // ignore JSON parse errors on malformed chunks
          }
        }
      }
    })

    socket.on('close', () => {
      this.socket = null
    })

    socket.on('error', () => {
      this.socket = null
    })
  }

  private handleIpcEvent(msg: any): void {
    if (msg.event === 'property-change') {
      if (msg.name === 'time-pos' && typeof msg.data === 'number') {
        this.lastTimePos = Math.floor(msg.data)
      } else if (msg.name === 'duration' && typeof msg.data === 'number') {
        this.lastDuration = Math.floor(msg.data)
      } else if (msg.name === 'pause' && typeof msg.data === 'boolean') {
        this.isPaused = msg.data
      } else if (msg.name === 'path' && typeof msg.data === 'string') {
        this.currentFilePath = msg.data
      } else if (msg.name === 'sub-delay' && typeof msg.data === 'number') {
        this.currentSubDelay = msg.data
      }

      // Immediately dispatch push telemetry to syncWorker
      this.syncWorker.handleTelemetryUpdate({
        currentTime: this.lastTimePos,
        duration: this.lastDuration,
        state: this.isPaused ? 'paused' : 'playing',
        filePath: this.currentFilePath,
        playerType: 'mpv'
      })
    } else if (msg.event === 'end-file' || msg.event === 'shutdown') {
      // File finished or player closed
    }
  }

  public async launchMovie(
    movie: Movie,
    startTime: number,
    subDelay: number
  ): Promise<LaunchResult> {
    const settings = this.storageService.getSettings()
    if (!settings.mpvPath || !fs.existsSync(settings.mpvPath)) {
      return {
        success: false,
        message: `mpv executable not found at "${settings.mpvPath}". Please check Settings.`
      }
    }

    await this.stop()
    this.currentSubDelay = subDelay
    this.currentFilePath = movie.primaryFilePath

    const mpvArgs = this.buildMpvArgs(movie.filePaths, startTime, subDelay)

    try {
      const child = spawn(settings.mpvPath, mpvArgs, {
        detached: false,
        stdio: 'ignore'
      })

      this.currentProcess = child
      this.syncWorker.startMovie(movie, 'mpv')

      child.on('error', (err) => {
        console.error('Failed to spawn mpv process:', err)
        this.syncWorker.stop()
        this.currentProcess = null
      })

      child.on('close', () => {
        this.syncWorker.stop()
        this.currentProcess = null
      })

      // Connect to named pipe in background
      this.connectIpc(this.getPipePath()).catch(() => {})

      return { success: true }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error launching mpv' }
    }
  }

  public async launchSeries(
    series: Series,
    targetEpisode: Episode,
    startIndex: number,
    startTime: number,
    subDelay: number
  ): Promise<LaunchResult> {
    const settings = this.storageService.getSettings()
    if (!settings.mpvPath || !fs.existsSync(settings.mpvPath)) {
      return {
        success: false,
        message: `mpv executable not found at "${settings.mpvPath}". Please check Settings.`
      }
    }

    await this.stop()

    const remainingEpisodes = series.episodes.slice(startIndex)
    const playlistPaths = remainingEpisodes.map((e) => e.filePath)
    this.currentSubDelay = subDelay
    this.currentFilePath = targetEpisode.filePath

    const mpvArgs = this.buildMpvArgs(playlistPaths, startTime, subDelay)

    try {
      const child = spawn(settings.mpvPath, mpvArgs, {
        detached: false,
        stdio: 'ignore'
      })

      this.currentProcess = child
      this.syncWorker.start(series, targetEpisode, 'mpv')

      child.on('error', (err) => {
        console.error('Failed to spawn mpv process:', err)
        this.syncWorker.stop()
        this.currentProcess = null
      })

      child.on('close', () => {
        this.syncWorker.stop()
        this.currentProcess = null
      })

      // Connect to named pipe in background
      this.connectIpc(this.getPipePath()).catch(() => {})

      return { success: true }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error launching mpv' }
    }
  }
}
