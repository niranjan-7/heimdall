import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { LibraryData, AppSettings, Series, Episode, Movie } from '../shared/types'
import { cleanEpisodeTitle, extractEpisodeNumber } from './folderScanner'

const DEFAULT_SETTINGS: AppSettings = {
  vlcPath: '',
  mpvPath: '',
  preferredPlayer: 'vlc',
  enableAnime4K: false,
  anime4kPreset: 'hq_lanczos',
  mpvCustomArgs: '',
  preferredSubtitleLanguage: 'en',
  openSubtitlesApiKey: '',
  autoDownloadSubtitles: false,
  completionThreshold: 0.9,
  httpPort: 42120,
  httpPassword: 'heimdall_secret',
  enableDiscordRPC: true,
  discordClientId: '737663962677510245',
  enableAniListScrobble: true,
  enableThumbnails: true,
  enableLiquidGlass: true,
  dimFillerEpisodes: true,
  uiTheme: 'liquid_glass',
  enableRemoteServer: true,
  remotePort: 42125
}

export class StorageService {
  private libraryPath: string
  private settingsPath: string
  private libraryData: LibraryData = { series: [], movies: [] }
  private settingsData: AppSettings = { ...DEFAULT_SETTINGS }

  constructor() {
    const userData = app.getPath('userData')
    this.libraryPath = path.join(userData, 'library.json')
    this.settingsPath = path.join(userData, 'settings.json')
    this.init()
  }

  private init(): void {
    this.loadSettings()
    this.loadLibrary()
  }

  public detectVlcPath(): string {
    const candidates = [
      'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
      'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
      '/usr/bin/vlc',
      '/usr/local/bin/vlc',
      '/Applications/VLC.app/Contents/MacOS/VLC'
    ]

    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) {
          return candidate
        }
      } catch {
        // ignore
      }
    }
    return ''
  }

  public detectMpvPath(): string {
    const localAppData = process.env.LOCALAPPDATA || ''
    const appData = process.env.APPDATA || ''
    const userProfile = process.env.USERPROFILE || ''
    const programData = process.env.ProgramData || ''

    const candidates = [
      'C:\\Program Files\\mpv\\mpv.exe',
      'C:\\Program Files (x86)\\mpv\\mpv.exe',
      'C:\\mpv\\mpv.exe',
      path.join(localAppData, 'Programs', 'mpv', 'mpv.exe'),
      path.join(appData, 'mpv', 'mpv.exe'),
      path.join(userProfile, 'scoop', 'apps', 'mpv', 'current', 'mpv.exe'),
      path.join(programData, 'chocolatey', 'bin', 'mpv.exe'),
      '/usr/bin/mpv',
      '/usr/local/bin/mpv',
      '/opt/homebrew/bin/mpv',
      '/Applications/mpv.app/Contents/MacOS/mpv'
    ]

    for (const candidate of candidates) {
      try {
        if (candidate && fs.existsSync(candidate)) {
          return candidate
        }
      } catch {
        // ignore
      }
    }
    return ''
  }

  private atomicWriteFileSync(filePath: string, content: string): void {
    const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`
    try {
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(tempPath, content, 'utf-8')
      fs.renameSync(tempPath, filePath)
    } catch {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath)
        }
      } catch {
        // ignore
      }
      fs.writeFileSync(filePath, content, 'utf-8')
    }
  }

  private loadSettings(): void {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const raw = fs.readFileSync(this.settingsPath, 'utf-8')
        this.settingsData = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
      } else {
        this.settingsData = { ...DEFAULT_SETTINGS }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      this.settingsData = { ...DEFAULT_SETTINGS }
    }

    let updated = false
    if (!this.settingsData.vlcPath || !fs.existsSync(this.settingsData.vlcPath)) {
      const detectedVlc = this.detectVlcPath()
      if (detectedVlc) {
        this.settingsData.vlcPath = detectedVlc
        updated = true
      }
    }

    if (!this.settingsData.mpvPath || !fs.existsSync(this.settingsData.mpvPath)) {
      const detectedMpv = this.detectMpvPath()
      if (detectedMpv) {
        this.settingsData.mpvPath = detectedMpv
        updated = true
      }
    }

    if (updated) {
      this.saveSettings(this.settingsData)
    }
  }

  public getSettings(): AppSettings {
    return { ...this.settingsData }
  }

  public saveSettings(newSettings: Partial<AppSettings>): AppSettings {
    this.settingsData = { ...this.settingsData, ...newSettings }
    this.atomicWriteFileSync(this.settingsPath, JSON.stringify(this.settingsData, null, 2))
    return this.getSettings()
  }

  private loadLibrary(): void {
    try {
      if (fs.existsSync(this.libraryPath)) {
        const raw = fs.readFileSync(this.libraryPath, 'utf-8')
        this.libraryData = JSON.parse(raw)
        if (!Array.isArray(this.libraryData.series)) {
          this.libraryData.series = []
        }
        if (!Array.isArray(this.libraryData.movies)) {
          this.libraryData.movies = []
        }
        let migratedTitles = false
        for (const s of this.libraryData.series) {
          if (s.aniListTitle && s.title !== s.aniListTitle) {
            s.title = s.aniListTitle
            migratedTitles = true
          }
        }
        if (migratedTitles) {
          this.saveLibrary()
        }
      } else {
        this.libraryData = { series: [], movies: [] }
      }
    } catch (error) {
      console.error('Failed to load library:', error)
      this.libraryData = { series: [], movies: [] }
    }
  }

  public getLibrary(): LibraryData {
    return { ...this.libraryData }
  }

  public saveLibrary(): void {
    this.atomicWriteFileSync(this.libraryPath, JSON.stringify(this.libraryData, null, 2))
  }

  // Series methods
  public getSeries(id: string): Series | undefined {
    return this.libraryData.series.find((s) => s.id === id)
  }

  public addOrUpdateSeries(series: Series): void {
    if (series.aniListTitle && series.title !== series.aniListTitle) {
      series.title = series.aniListTitle
    }
    const index = this.libraryData.series.findIndex((s) => s.id === series.id)
    if (index >= 0) {
      this.libraryData.series[index] = series
    } else {
      this.libraryData.series.unshift(series)
    }
    this.saveLibrary()
  }

  public removeSeries(id: string): boolean {
    const initialLen = this.libraryData.series.length
    this.libraryData.series = this.libraryData.series.filter((s) => s.id !== id)
    if (this.libraryData.series.length !== initialLen) {
      this.saveLibrary()
      return true
    }
    return false
  }

  public updateEpisodeProgress(
    seriesId: string,
    episodeId: string,
    update: {
      timeSec?: number
      durationSec?: number
      completed?: boolean
      lastWatchedAt?: number | null
      hasThumbnail?: boolean
    }
  ): Episode | null {
    const series = this.getSeries(seriesId)
    if (!series) return null

    const episode = series.episodes.find((e) => e.id === episodeId)
    if (!episode) return null

    if (update.timeSec !== undefined) episode.timeSec = update.timeSec
    if (update.durationSec !== undefined && update.durationSec > 0)
      episode.durationSec = update.durationSec
    if (update.completed !== undefined) episode.completed = update.completed
    if (update.lastWatchedAt !== undefined) episode.lastWatchedAt = update.lastWatchedAt
    if (update.hasThumbnail !== undefined) episode.hasThumbnail = update.hasThumbnail

    series.lastActiveEpisodeId = episodeId
    series.updatedAt = Date.now()

    this.saveLibrary()
    return episode
  }

  public batchUpdateEpisodes(
    seriesId: string,
    episodeIds: string[],
    update: { completed?: boolean; resetProgress?: boolean }
  ): Series | null {
    const series = this.getSeries(seriesId)
    if (!series) return null

    const idSet = new Set(episodeIds)
    const now = Date.now()

    for (const ep of series.episodes) {
      if (idSet.has(ep.id)) {
        if (update.completed !== undefined) {
          ep.completed = update.completed
          if (update.completed) {
            ep.timeSec = ep.durationSec > 0 ? ep.durationSec : ep.timeSec
          } else {
            ep.timeSec = 0
          }
          ep.lastWatchedAt = update.completed ? now : null
        }
        if (update.resetProgress) {
          ep.timeSec = 0
          ep.completed = false
        }
      }
    }

    series.updatedAt = now
    this.saveLibrary()
    return series
  }

  public batchNormalizeEpisodeTitles(seriesId: string, episodeIds?: string[]): Series | null {
    const series = this.getSeries(seriesId)
    if (!series) return null

    const idSet = episodeIds && episodeIds.length > 0 ? new Set(episodeIds) : null

    for (const ep of series.episodes) {
      if (!idSet || idSet.has(ep.id)) {
        const epNum = extractEpisodeNumber(ep.fileName)
        if (epNum !== null) {
          ep.episodeNumber = epNum
        }
        ep.title = cleanEpisodeTitle(ep.fileName)
      }
    }

    // Re-sort series episodes numerically so playlists stay synchronized
    series.episodes.sort((a, b) => {
      if (a.seasonFolder !== b.seasonFolder) {
        return a.seasonFolder.localeCompare(b.seasonFolder, undefined, { numeric: true })
      }
      if (a.episodeNumber !== null && b.episodeNumber !== null && a.episodeNumber !== b.episodeNumber) {
        return a.episodeNumber - b.episodeNumber
      }
      return a.fileName.localeCompare(b.fileName, undefined, { numeric: true })
    })

    series.updatedAt = Date.now()
    this.saveLibrary()
    return series
  }

  public markEpisodesPriorTo(seriesId: string, targetEpisodeId: string): Series | null {
    const series = this.getSeries(seriesId)
    if (!series) return null

    const targetIndex = series.episodes.findIndex((e) => e.id === targetEpisodeId)
    if (targetIndex < 0) return null

    const now = Date.now()
    for (let i = 0; i < targetIndex; i++) {
      const ep = series.episodes[i]
      ep.completed = true
      ep.timeSec = ep.durationSec > 0 ? ep.durationSec : ep.timeSec
      ep.lastWatchedAt = now
    }

    series.updatedAt = now
    this.saveLibrary()
    return series
  }

  // Movie methods
  public getMovies(): Movie[] {
    return this.libraryData.movies || []
  }

  public getMovie(id: string): Movie | undefined {
    return (this.libraryData.movies || []).find((m) => m.id === id)
  }

  public addOrUpdateMovie(movie: Movie): void {
    if (!this.libraryData.movies) this.libraryData.movies = []
    const index = this.libraryData.movies.findIndex((m) => m.id === movie.id)
    if (index >= 0) {
      this.libraryData.movies[index] = movie
    } else {
      this.libraryData.movies.unshift(movie)
    }
    this.saveLibrary()
  }

  public removeMovie(id: string): boolean {
    if (!this.libraryData.movies) return false
    const initialLen = this.libraryData.movies.length
    this.libraryData.movies = this.libraryData.movies.filter((m) => m.id !== id)
    if (this.libraryData.movies.length !== initialLen) {
      this.saveLibrary()
      return true
    }
    return false
  }

  public updateMovieProgress(
    movieId: string,
    update: {
      timeSec?: number
      durationSec?: number
      completed?: boolean
      lastWatchedAt?: number | null
      hasThumbnail?: boolean
      subDelaySec?: number
    }
  ): Movie | null {
    const movie = this.getMovie(movieId)
    if (!movie) return null

    if (update.timeSec !== undefined) movie.timeSec = update.timeSec
    if (update.durationSec !== undefined && update.durationSec > 0)
      movie.durationSec = update.durationSec
    if (update.completed !== undefined) movie.completed = update.completed
    if (update.lastWatchedAt !== undefined) movie.lastWatchedAt = update.lastWatchedAt
    if (update.hasThumbnail !== undefined) movie.hasThumbnail = update.hasThumbnail
    if (update.subDelaySec !== undefined) movie.subDelaySec = update.subDelaySec

    this.saveLibrary()
    return movie
  }
}
