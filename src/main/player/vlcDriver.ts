import { spawn, ChildProcess } from 'child_process'
import { pathToFileURL } from 'url'
import * as fs from 'fs'
import { Series, Episode, Movie } from '../../shared/types'
import { StorageService } from '../storageService'
import { SyncWorker } from '../syncWorker'
import { IMediaPlayerDriver, LaunchResult } from './types'
import { existingSubFile, vlcPlaylistArgs, vlcSubDelayArg } from './playlist'

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

  /** Loads an external subtitle into the playing item; VLC switches to the track it adds. */
  public async addSubtitle(filePath: string): Promise<boolean> {
    if (!this.isRunning()) return false
    try {
      const settings = this.storageService.getSettings()
      const auth = 'Basic ' + Buffer.from(':' + settings.httpPassword).toString('base64')
      const val = encodeURIComponent(pathToFileURL(filePath).href)
      const url = `http://127.0.0.1:${settings.httpPort}/requests/status.json?command=addsubtitle&val=${val}`
      const res = await fetch(url, { headers: { Authorization: auth }, signal: AbortSignal.timeout(1000) })
      return res.ok
    } catch {
      return false
    }
  }

  /** VLC's web interface doesn't say which subtitle file is showing. */
  public async getSelectedExternalSubtitle(): Promise<string | null> {
    return null
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

    const vlcArgs = vlcPlaylistArgs(
      movie.filePaths.map((p, i) => ({
        path: p,
        subFile: i === 0 ? existingSubFile(movie.syncedSubtitlePath) : undefined
      })),
      startTime
    )
    vlcArgs.push(
      '--extraintf=http',
      `--http-port=${settings.httpPort}`,
      `--http-password=${settings.httpPassword}`
    )

    if (subDelay !== 0) {
      vlcArgs.push(vlcSubDelayArg(subDelay))
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

    const remainingEpisodes = series.episodes.slice(startIndex).filter((e) => !e.fileMissing && fs.existsSync(e.filePath))
    this.currentSubDelay = subDelay

    const vlcArgs = vlcPlaylistArgs(
      remainingEpisodes.map((e) => ({ path: e.filePath, subFile: existingSubFile(e.syncedSubtitlePath) })),
      startTime
    )
    vlcArgs.push(
      '--extraintf=http',
      `--http-port=${settings.httpPort}`,
      `--http-password=${settings.httpPassword}`
    )

    if (subDelay !== 0) {
      vlcArgs.push(vlcSubDelayArg(subDelay))
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
