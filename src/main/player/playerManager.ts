import * as fs from 'fs'
import { Series, Episode, Movie, MediaPlayerType } from '../../shared/types'
import { StorageService } from '../storageService'
import { SyncWorker } from '../syncWorker'
import { IMediaPlayerController, IMediaPlayerDriver, LaunchResult } from './types'
import { VlcDriver } from './vlcDriver'
import { MpvDriver } from './mpvDriver'

export class PlayerManager implements IMediaPlayerController {
  private vlcDriver: VlcDriver
  private mpvDriver: MpvDriver
  private storageService: StorageService
  private activeDriver: IMediaPlayerDriver | null = null

  constructor(storageService: StorageService, syncWorker: SyncWorker) {
    this.storageService = storageService
    this.vlcDriver = new VlcDriver(storageService, syncWorker)
    this.mpvDriver = new MpvDriver(storageService, syncWorker)
  }

  public isRunning(): boolean {
    return (
      (this.vlcDriver.isRunning()) ||
      (this.mpvDriver.isRunning())
    )
  }

  public getActivePlayer(): MediaPlayerType | null {
    if (this.mpvDriver.isRunning()) return 'mpv'
    if (this.vlcDriver.isRunning()) return 'vlc'
    return null
  }

  public async stopCurrentProcess(): Promise<void> {
    await Promise.all([
      this.vlcDriver.stop(),
      this.mpvDriver.stop()
    ])
    this.activeDriver = null
  }

  public async setSubtitleDelay(delaySec: number): Promise<boolean> {
    if (this.activeDriver && this.activeDriver.isRunning()) {
      return await this.activeDriver.setSubtitleDelay(delaySec)
    }
    // Also update both drivers so whenever one starts, it has the state
    await Promise.all([
      this.vlcDriver.setSubtitleDelay(delaySec),
      this.mpvDriver.setSubtitleDelay(delaySec)
    ])
    return true
  }

  public getSubtitleDelay(): number {
    if (this.activeDriver && this.activeDriver.isRunning()) {
      return this.activeDriver.getSubtitleDelay()
    }
    return this.vlcDriver.getSubtitleDelay() || this.mpvDriver.getSubtitleDelay()
  }

  public async togglePause(): Promise<boolean> {
    if (this.activeDriver && this.activeDriver.isRunning()) {
      return await this.activeDriver.togglePause()
    }
    return false
  }

  public async seek(timeSec: number): Promise<boolean> {
    if (this.activeDriver && this.activeDriver.isRunning()) {
      return await this.activeDriver.seek(timeSec)
    }
    return false
  }

  private resolveDriver(): { driver: IMediaPlayerDriver | null; error?: string } {
    const settings = this.storageService.getSettings()
    const preferred = settings.preferredPlayer || 'vlc'

    const hasVlc = Boolean(settings.vlcPath && fs.existsSync(settings.vlcPath))
    const hasMpv = Boolean(settings.mpvPath && fs.existsSync(settings.mpvPath))

    if (preferred === 'mpv') {
      if (hasMpv) return { driver: this.mpvDriver }
      if (hasVlc) return { driver: this.vlcDriver }
      return {
        driver: null,
        error: `Neither mpv nor VLC was found on this system. Please check your media player paths in Settings.`
      }
    } else {
      // Default preferred VLC
      if (hasVlc) return { driver: this.vlcDriver }
      if (hasMpv) return { driver: this.mpvDriver }
      return {
        driver: null,
        error: `Neither VLC nor mpv was found on this system. Please configure at least one player in Settings.`
      }
    }
  }

  public async launchMovie(
    movieId: string,
    options: { startTime?: number } = {}
  ): Promise<LaunchResult> {
    const movie = this.storageService.getMovie(movieId)
    if (!movie || movie.filePaths.length === 0) {
      return { success: false, message: 'Movie not found or has no playable files.' }
    }

    const { driver, error } = this.resolveDriver()
    if (!driver || error) {
      return { success: false, message: error }
    }

    let startTime = options.startTime ?? movie.timeSec
    if (movie.completed && options.startTime === undefined) {
      startTime = 0
    }

    await this.stopCurrentProcess()

    const subDelay = movie.subDelaySec ?? 0
    const res = await driver.launchMovie(movie, startTime, subDelay)

    if (res.success) {
      this.activeDriver = driver
      this.storageService.updateMovieProgress(movie.id, {
        lastWatchedAt: Date.now()
      })
    }

    return res
  }

  public async launchSeries(
    seriesId: string,
    targetEpisodeId?: string,
    options: { advanceIfCompleted?: boolean; startTime?: number } = {}
  ): Promise<LaunchResult> {
    const series = this.storageService.getSeries(seriesId)
    if (!series || series.episodes.length === 0) {
      return { success: false, message: 'Series not found or has no playable episodes.' }
    }

    const { driver, error } = this.resolveDriver()
    if (!driver || error) {
      return { success: false, message: error }
    }

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

    if (targetEpisode.fileMissing || !fs.existsSync(targetEpisode.filePath)) {
      return {
        success: false,
        message: `Video file for Episode ${targetEpisode.episodeNumber ?? ''} is not on disk (deleted to free space). Watch progress is preserved.`
      }
    }

    let startTime = options.startTime ?? targetEpisode.timeSec

    if (options.advanceIfCompleted && targetEpisode.completed) {
      if (startIndex + 1 < series.episodes.length) {
        startIndex = startIndex + 1
        targetEpisode = series.episodes[startIndex]
        startTime = 0
      }
    }

    await this.stopCurrentProcess()

    const subDelay = targetEpisode.subDelaySec ?? series.defaultSubDelaySec ?? 0
    const res = await driver.launchSeries(series, targetEpisode, startIndex, startTime, subDelay)

    if (res.success) {
      this.activeDriver = driver
      this.storageService.updateEpisodeProgress(series.id, targetEpisode.id, {
        lastWatchedAt: Date.now()
      })
    }

    return res
  }
}
