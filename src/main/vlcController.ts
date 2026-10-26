import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import { Series, Episode } from '../shared/types'
import { StorageService } from './storageService'
import { SyncWorker } from './syncWorker'

export class VlcController {
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

  public async stopCurrentProcess(): Promise<void> {
    if (this.currentProcess) {
      this.syncWorker.stop()

      // Try graceful HTTP stop command first
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

  public async launchSeries(
    seriesId: string,
    targetEpisodeId?: string,
    options: { advanceIfCompleted?: boolean; startTime?: number } = {}
  ): Promise<{ success: boolean; message?: string }> {
    const series = this.storageService.getSeries(seriesId)
    if (!series || series.episodes.length === 0) {
      return { success: false, message: 'Series not found or has no playable episodes.' }
    }

    const settings = this.storageService.getSettings()
    if (!settings.vlcPath || !fs.existsSync(settings.vlcPath)) {
      return {
        success: false,
        message: `VLC executable not found at "${settings.vlcPath}". Please check Settings.`
      }
    }

    // Determine target episode
    let startIndex = 0
    if (targetEpisodeId) {
      const idx = series.episodes.findIndex((e) => e.id === targetEpisodeId)
      if (idx >= 0) {
        startIndex = idx
      }
    } else if (series.lastActiveEpisodeId) {
      const idx = series.episodes.findIndex((e) => e.id === series.lastActiveEpisodeId)
      if (idx >= 0) {
        startIndex = idx
      }
    }

    let targetEpisode = series.episodes[startIndex]
    let startTime = options.startTime ?? targetEpisode.timeSec

    // If advanceIfCompleted is requested and target episode is completed, advance to next episode
    if (options.advanceIfCompleted && targetEpisode.completed) {
      if (startIndex + 1 < series.episodes.length) {
        startIndex = startIndex + 1
        targetEpisode = series.episodes[startIndex]
        startTime = 0
      }
    }

    // Stop previous VLC instance cleanly
    await this.stopCurrentProcess()

    // Slice array from index N to end
    const remainingEpisodes = series.episodes.slice(startIndex)
    const playlistPaths = remainingEpisodes.map((e) => e.filePath)

    // Retrieve saved subtitle delay
    const subDelay = targetEpisode.subDelaySec ?? series.defaultSubDelaySec ?? 0
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

      // Start live sync worker
      this.syncWorker.start(series, targetEpisode)

      child.on('error', (err) => {
        console.error('Failed to spawn VLC process:', err)
        this.syncWorker.stop()
        this.currentProcess = null
      })

      child.on('close', () => {
        this.syncWorker.stop()
        this.currentProcess = null
      })

      // Update series lastActiveEpisodeId
      this.storageService.updateEpisodeProgress(series.id, targetEpisode.id, {
        lastWatchedAt: Date.now()
      })

      return { success: true }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error launching VLC' }
    }
  }
}
