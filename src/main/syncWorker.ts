import { BrowserWindow } from 'electron'
import * as path from 'path'
import { Series, Episode, Movie, VlcStateUpdate, AppSettings, MediaPlayerType } from '../shared/types'
import { StorageService } from './storageService'
import { DiscordService } from './discordService'
import { AniListService } from './anilistService'

export class SyncWorker {
  private timer: NodeJS.Timeout | null = null
  private storageService: StorageService
  private discordService: DiscordService
  private anilistService: AniListService
  private activeSeries: Series | null = null
  private activeEpisode: Episode | null = null
  private activeMovie: Movie | null = null
  private activePlayerType: MediaPlayerType = 'vlc'
  private getMainWindow: () => BrowserWindow | null
  private consecutiveErrors = 0
  private scrobbledEpisodeIds = new Set<string>()

  constructor(
    storageService: StorageService,
    discordService: DiscordService,
    anilistService: AniListService,
    getMainWindow: () => BrowserWindow | null
  ) {
    this.storageService = storageService
    this.discordService = discordService
    this.anilistService = anilistService
    this.getMainWindow = getMainWindow
  }

  public start(series: Series, initialEpisode: Episode, playerType: MediaPlayerType = 'vlc'): void {
    this.stop()
    this.activeSeries = series
    this.activeEpisode = initialEpisode
    this.activeMovie = null
    this.activePlayerType = playerType
    this.consecutiveErrors = 0
    this.scrobbledEpisodeIds.clear()

    series.episodes.forEach((e) => {
      if (e.completed) {
        this.scrobbledEpisodeIds.add(e.id)
      }
    })

    if (playerType === 'vlc') {
      this.timer = setInterval(() => {
        this.pollVlcStatus().catch(() => {
          this.consecutiveErrors++
        })
      }, 1500)
    }
  }

  public startMovie(movie: Movie, playerType: MediaPlayerType = 'vlc'): void {
    this.stop()
    this.activeSeries = null
    this.activeEpisode = null
    this.activeMovie = movie
    this.activePlayerType = playerType
    this.consecutiveErrors = 0

    if (playerType === 'vlc') {
      this.timer = setInterval(() => {
        this.pollVlcStatus().catch(() => {
          this.consecutiveErrors++
        })
      }, 1500)
    }
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    this.storageService.saveLibrary()
    this.discordService.clearActivity().catch(() => {})

    const win = this.getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('vlc:stopped', {
        seriesId: this.activeSeries ? this.activeSeries.id : null,
        episodeId: this.activeEpisode ? this.activeEpisode.id : null,
        movieId: this.activeMovie ? this.activeMovie.id : null,
        playerType: this.activePlayerType
      })
    }

    this.activeSeries = null
    this.activeEpisode = null
    this.activeMovie = null
    this.consecutiveErrors = 0
  }

  private async pollVlcStatus(): Promise<void> {
    if (!this.activeSeries && !this.activeMovie) return

    const settings = this.storageService.getSettings()
    const url = `http://127.0.0.1:${settings.httpPort}/requests/status.json`
    const authHeader = 'Basic ' + Buffer.from(':' + settings.httpPassword).toString('base64')

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1200)

      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: authHeader },
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      if (!response.ok) return

      const data = await response.json()
      this.consecutiveErrors = 0
      this.handleVlcData(data)
    } catch {
      this.consecutiveErrors++
    }
  }

  private handleVlcData(data: any): void {
    const state: 'playing' | 'paused' | 'stopped' =
      data.state === 'playing' ? 'playing' : data.state === 'paused' ? 'paused' : 'stopped'

    const currentTime = Math.floor(Number(data.time) || 0)
    const duration = Math.floor(Number(data.length) || 0)

    const meta = data.information?.category?.meta
    const filename = meta?.filename || ''
    const url = meta?.url || ''

    this.handleTelemetryUpdate({
      currentTime,
      duration,
      state,
      filename,
      filePath: url,
      playerType: 'vlc'
    })
  }

  public handleTelemetryUpdate(telemetry: {
    currentTime: number
    duration: number
    state: 'playing' | 'paused' | 'stopped'
    filename?: string
    filePath?: string
    playerType?: MediaPlayerType
  }): void {
    const settings = this.storageService.getSettings()
    const { currentTime, duration, state, filename = '', filePath = '' } = telemetry
    const playerType = telemetry.playerType || this.activePlayerType

    // 1. Movie handling
    if (this.activeMovie) {
      const movie = this.activeMovie
      const threshold = settings.completionThreshold || 0.9
      const isCompleted = duration > 0 ? currentTime / duration >= threshold : false

      if ((state === 'playing' || state === 'paused') && currentTime > 2) {
        this.storageService.updateMovieProgress(movie.id, {
          timeSec: currentTime,
          durationSec: duration > 0 ? duration : movie.durationSec,
          completed: isCompleted || movie.completed,
          lastWatchedAt: Date.now()
        })
      }

      this.discordService
        .updateActivity({
          seriesTitle: movie.year ? `${movie.title} (${movie.year})` : movie.title,
          episodeNumber: null,
          currentTime,
          duration,
          isPlaying: state === 'playing',
          coverImage: movie.posterUrl
        })
        .catch(() => {})

      const win = this.getMainWindow()
      if (win && !win.isDestroyed()) {
        const update: VlcStateUpdate = {
          isRunning: true,
          seriesId: null,
          movieId: movie.id,
          episodeId: null,
          filePath: movie.primaryFilePath,
          filename: movie.fileName,
          state,
          currentTime,
          duration,
          completed: movie.completed || isCompleted,
          playerType
        }
        win.webContents.send('vlc:progress-update', update)
      }
      return
    }

    // 2. Series handling
    if (!this.activeSeries) return

    const matchedEpisode = this.matchEpisode(filename, filePath)
    if (matchedEpisode) {
      this.activeEpisode = matchedEpisode
    }

    const currentEp = this.activeEpisode
    let isCompleted = false

    if (currentEp && (state === 'playing' || state === 'paused') && currentTime > 2) {
      const threshold = settings.completionThreshold || 0.9
      isCompleted = duration > 0 ? currentTime / duration >= threshold : false

      if (
        (isCompleted || currentEp.completed) &&
        !this.scrobbledEpisodeIds.has(currentEp.id) &&
        currentEp.episodeNumber !== null
      ) {
        this.scrobbledEpisodeIds.add(currentEp.id)
        this.triggerAniListScrobble(this.activeSeries, currentEp, settings)
      }

      this.storageService.updateEpisodeProgress(this.activeSeries.id, currentEp.id, {
        timeSec: currentTime,
        durationSec: duration > 0 ? duration : currentEp.durationSec,
        completed: isCompleted || currentEp.completed,
        lastWatchedAt: Date.now()
      })
    }

    if (currentEp) {
      this.discordService
        .updateActivity({
          seriesTitle: this.activeSeries.title,
          episodeNumber: currentEp.episodeNumber,
          currentTime,
          duration,
          isPlaying: state === 'playing',
          coverImage: this.activeSeries.coverImage
        })
        .catch(() => {})
    }

    const win = this.getMainWindow()
    if (win && !win.isDestroyed()) {
      const update: VlcStateUpdate = {
        isRunning: true,
        seriesId: this.activeSeries.id,
        movieId: null,
        episodeId: currentEp ? currentEp.id : null,
        filePath: currentEp ? currentEp.filePath : null,
        filename: currentEp ? currentEp.fileName : filename,
        state,
        currentTime,
        duration,
        completed: currentEp ? currentEp.completed || isCompleted : false,
        playerType
      }
      win.webContents.send('vlc:progress-update', update)
    }
  }

  private async triggerAniListScrobble(
    series: Series,
    episode: Episode,
    settings: AppSettings
  ): Promise<void> {
    if (
      !settings.enableAniListScrobble ||
      !settings.aniListToken ||
      !series.aniListId ||
      episode.episodeNumber === null
    ) {
      return
    }

    const res = await this.anilistService.scrobbleProgress(
      series.aniListId,
      episode.episodeNumber,
      settings.aniListToken
    )

    const win = this.getMainWindow()
    if (win && !win.isDestroyed()) {
      if (res.success) {
        win.webContents.send('app:notification', {
          type: 'success',
          message: `🎉 Scrobbled Episode ${episode.episodeNumber} to AniList!`
        })
      } else if (res.error) {
        win.webContents.send('app:notification', {
          type: 'error',
          message: `AniList scrobble failed: ${res.error}`
        })
      }
    }
  }

  private matchEpisode(vlcFilename: string, vlcUrl: string): Episode | null {
    if (!this.activeSeries) return null

    let decodedUrl = ''
    try {
      if (vlcUrl) {
        decodedUrl = decodeURIComponent(vlcUrl).replace(/^file:\/\/\/?/i, '')
      }
    } catch {
      decodedUrl = vlcUrl
    }

    const cleanVlcFile = vlcFilename ? path.basename(vlcFilename).toLowerCase() : ''
    const cleanUrlFile = decodedUrl ? path.basename(decodedUrl).toLowerCase() : ''

    for (const ep of this.activeSeries.episodes) {
      const epBase = path.basename(ep.filePath).toLowerCase()
      if (cleanVlcFile && epBase === cleanVlcFile) return ep
      if (cleanUrlFile && epBase === cleanUrlFile) return ep
    }

    for (const ep of this.activeSeries.episodes) {
      const epNorm = path.normalize(ep.filePath).toLowerCase()
      if (decodedUrl && epNorm.includes(path.normalize(decodedUrl).toLowerCase())) return ep
      if (vlcFilename && epNorm.includes(path.normalize(vlcFilename).toLowerCase())) return ep
    }

    return this.activeEpisode
  }
}
