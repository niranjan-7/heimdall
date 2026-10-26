import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import { Series, Episode, Movie } from '../../shared/types'
import { StorageService } from '../storageService'
import { SyncWorker } from '../syncWorker'
import { IMediaPlayerDriver, LaunchResult } from './types'

export class VlcDriver implements IMediaPlayerDriver {
  public readonly playerType = 'vlc' as const
  private currentProcess: ChildProcess | null = null
  private storageService: StorageService
  private syncWorker: SyncWorker
  private currentSubDelay = 0

  constructor(storageService: StorageService, syncWorker: SyncWorker) {
    this.storageService = storageService
    this.syncWorker = syncWorker
  }

  public isRunning(): boolean {
    return this.currentProcess !== null && !this.currentProcess.killed
  }

  public async setSubtitleDelay(delaySec: number): Promise<boolean> {
    this.currentSubDelay = delaySec
    if (!this.isRunning()) return true

    try {
      const settings = this.storageService.getSettings()
      const auth = 'Basic ' + Buffer.from(':' + settings.httpPassword).toString('base64')
      const url = `http://127.0.0.1:${settings.httpPort}/requests/status.json?command=subdelay&val=${delaySec}`

      const res = await fetch(url, {
        headers: { Authorization: auth },
        signal: AbortSignal.timeout(1000)
      })
      return res.ok
    } catch {
      return false
    }
  }

  public getSubtitleDelay(): number {
    return this.currentSubDelay
  }

  public async togglePause(): Promise<boolean> {
    if (!this.isRunning()) return false
    try {
      const settings = this.storageService.getSettings()
      const auth = 'Basic ' + Buffer.from(':' + settings.httpPassword).toString('base64')
      const url = `http://127.0.0.1:${settings.httpPort}/requests/status.json?command=pl_pause`
      const res = await fetch(url, { headers: { Authorization: auth }, signal: AbortSignal.timeout(600) })
      return res.ok
    } catch {
      return false
    }
  }

  public async seek(timeSec: number): Promise<boolean> {
    if (!this.isRunning()) return false
    try {
      const settings = this.storageService.getSettings()
      const auth = 'Basic ' + Buffer.from(':' + settings.httpPassword).toString('base64')
      const url = `http://127.0.0.1:${settings.httpPort}/requests/status.json?command=seek&val=${Math.floor(timeSec)}`
      const res = await fetch(url, { headers: { Authorization: auth }, signal: AbortSignal.timeout(600) })
      return res.ok
    } catch {
      return false
    }
  }

  public async stop(): Promise<void> {
    if (this.currentProcess) {
      try {
        const settings = this.storageService.getSettings()
        const auth = 'Basic ' + Buffer.from(':' + settings.httpPassword).toString('base64')
        await fetch(`http://127.0.0.1:${settings.httpPort}/requests/status.json?command=pl_stop`, {
          headers: { Authorization: auth },
          signal: AbortSignal.timeout(400)
        }).catch(() => {})
      } catch {
        // ignore
      }

      try {
        this.currentProcess.kill('SIGTERM')
      } catch {
        // ignore
      }

      this.currentProcess = null
      this.currentSubDelay = 0
    }
  }

  public async launchMovie(
    movie: Movie,
    startTime: number,
    subDelay: number
  ): Promise<LaunchResult> {
    const settings = this.storageService.getSettings()
    if (!settings.vlcPath || !fs.existsSync(settings.vlcPath)) {
      return {
        success: false,
        message: `VLC executable not found at "${settings.vlcPath}". Please check Settings.`
      }
    }

    await this.stop()
    this.currentSubDelay = subDelay

    const vlcArgs = [
      ...movie.filePaths,
      `--start-time=${Math.max(0, Math.floor(startTime))}`,
      '--extraintf=http',
      `--http-port=${settings.httpPort}`,
      `--http-password=${settings.httpPassword}`
    ]

    if (subDelay !== 0) {
      vlcArgs.push(`--sub-delay=${subDelay}`)
    }

    try {
      const child = spawn(settings.vlcPath, vlcArgs, {
        detached: false,
        stdio: 'ignore'
      })

      this.currentProcess = child
      this.syncWorker.startMovie(movie, 'vlc')

      child.on('error', (err) => {
        console.error('Failed to spawn VLC process:', err)
        this.syncWorker.stop()
        this.currentProcess = null
      })

      child.on('close', () => {
        this.syncWorker.stop()
        this.currentProcess = null
      })

      return { success: true }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error launching VLC' }
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
    if (!settings.vlcPath || !fs.existsSync(settings.vlcPath)) {
      return {
        success: false,
        message: `VLC executable not found at "${settings.vlcPath}". Please check Settings.`
      }
    }

    await this.stop()

    const remainingEpisodes = series.episodes.slice(startIndex)
    const playlistPaths = remainingEpisodes.map((e) => e.filePath)
    this.currentSubDelay = subDelay

    const vlcArgs = [
      ...playlistPaths,
      `--start-time=${Math.max(0, Math.floor(startTime))}`,
      '--extraintf=http',
      `--http-port=${settings.httpPort}`,
      `--http-password=${settings.httpPassword}`
    ]

    if (subDelay !== 0) {
      vlcArgs.push(`--sub-delay=${subDelay}`)
    }

    try {
      const child = spawn(settings.vlcPath, vlcArgs, {
        detached: false,
        stdio: 'ignore'
      })

      this.currentProcess = child
      this.syncWorker.start(series, targetEpisode, 'vlc')

      child.on('error', (err) => {
        console.error('Failed to spawn VLC process:', err)
        this.syncWorker.stop()
        this.currentProcess = null
      })

      child.on('close', () => {
        this.syncWorker.stop()
        this.currentProcess = null
      })

      return { success: true }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error launching VLC' }
    }
  }
}
