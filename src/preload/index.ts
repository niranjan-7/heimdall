import { contextBridge, ipcRenderer } from 'electron'
import {
  AppSettings,
  LibraryData,
  Series,
  Episode,
  Movie,
  VlcStateUpdate,
  AniListMediaInfo,
  TmdbMovieSearchResult,
  AppNotification
} from '../shared/types'

export interface IElectronAPI {
  getLibrary: () => Promise<LibraryData>
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>
  selectFolder: () => Promise<string | null>
  selectVlcExecutable: () => Promise<string | null>

  // Series
  addSeries: (folderPath: string) => Promise<Series>
  addSeasonToSeries: (seriesId: string, folderPath: string) => Promise<Series>
  rescanSeries: (seriesId: string) => Promise<Series>
  removeSeries: (seriesId: string) => Promise<boolean>
  toggleEpisodeCompleted: (
    seriesId: string,
    episodeId: string,
    completed?: boolean
  ) => Promise<Episode | null>
  resetEpisodeProgress: (seriesId: string, episodeId: string) => Promise<Episode | null>
  playVlc: (
    seriesId: string,
    episodeId?: string,
    options?: { advanceIfCompleted?: boolean; startTime?: number }
  ) => Promise<{ success: boolean; message?: string }>
  stopVlc: () => Promise<void>

  // Module 2: Movies
  scanMoviesFolder: (folderPath: string) => Promise<Movie[]>
  removeMovie: (movieId: string) => Promise<boolean>
  playMovie: (
    movieId: string,
    options?: { startTime?: number }
  ) => Promise<{ success: boolean; message?: string }>
  toggleMovieCompleted: (movieId: string, completed?: boolean) => Promise<Movie | null>
  resetMovieProgress: (movieId: string) => Promise<Movie | null>
  searchTmdb: (query: string, year?: number) => Promise<TmdbMovieSearchResult[]>
  fixMovieMatch: (movieId: string, tmdbId: number) => Promise<Movie>

  // Module 1: Subtitle Sync
  autoSyncSubtitle: (
    seriesId: string,
    episodeId: string
  ) => Promise<{ success: boolean; offsetSec: number; message: string }>
  autoSyncMovieSubtitle: (
    movieId: string
  ) => Promise<{ success: boolean; offsetSec: number; message: string }>
  nudgeSubtitleDelay: (
    seriesId: string,
    episodeId: string,
    deltaSec: number,
    applyToSeason: boolean
  ) => Promise<{ currentDelay: number }>
  nudgeMovieSubtitleDelay: (
    movieId: string,
    deltaSec: number
  ) => Promise<{ currentDelay: number }>
  resetSubtitleDelay: (
    seriesId: string,
    episodeId: string
  ) => Promise<{ currentDelay: number }>
  resetMovieSubtitleDelay: (movieId: string) => Promise<{ currentDelay: number }>
  getSubtitleDelay: () => Promise<number>

  // Feature 6: AniList
  searchAniList: (query: string) => Promise<AniListMediaInfo[]>
  validateAniListToken: (
    token: string
  ) => Promise<{ success: boolean; username?: string; avatar?: string; error?: string }>
  linkAniListMedia: (
    seriesId: string,
    media: { id: number; title?: string; coverImage?: string; bannerImage?: string }
  ) => Promise<Series>
  unlinkAniListMedia: (seriesId: string) => Promise<Series>

  // Feature 2: Thumbnails
  queueThumbnails: (seriesId: string) => Promise<void>

  // Listeners
  onVlcProgressUpdate: (callback: (update: VlcStateUpdate) => void) => () => void
  onVlcStopped: (
    callback: (info: {
      seriesId: string | null
      episodeId: string | null
      movieId?: string | null
    }) => void
  ) => () => void
  onThumbnailGenerated: (
    callback: (info: { id: string; isMovie?: boolean }) => void
  ) => () => void
  onNotification: (callback: (notification: AppNotification) => void) => () => void
  onSeriesUpdated: (callback: (series: Series) => void) => () => void
  onMovieUpdated: (callback: (movie: Movie) => void) => () => void
}

const api: IElectronAPI = {
  getLibrary: () => ipcRenderer.invoke('storage:get-library'),
  getSettings: () => ipcRenderer.invoke('storage:get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('storage:save-settings', settings),
  selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),
  selectVlcExecutable: () => ipcRenderer.invoke('dialog:select-vlc-executable'),

  addSeries: (folderPath) => ipcRenderer.invoke('series:add', folderPath),
  addSeasonToSeries: (seriesId, folderPath) =>
    ipcRenderer.invoke('series:add-season', seriesId, folderPath),
  rescanSeries: (seriesId) => ipcRenderer.invoke('series:rescan', seriesId),
  removeSeries: (seriesId) => ipcRenderer.invoke('series:remove', seriesId),
  toggleEpisodeCompleted: (seriesId, episodeId, completed) =>
    ipcRenderer.invoke('episode:toggle-completed', seriesId, episodeId, completed),
  resetEpisodeProgress: (seriesId, episodeId) =>
    ipcRenderer.invoke('episode:reset-progress', seriesId, episodeId),
  playVlc: (seriesId, episodeId, options) =>
    ipcRenderer.invoke('vlc:play', seriesId, episodeId, options),
  stopVlc: () => ipcRenderer.invoke('vlc:stop'),

  // Movies
  scanMoviesFolder: (folderPath) => ipcRenderer.invoke('movies:scan-folder', folderPath),
  removeMovie: (movieId) => ipcRenderer.invoke('movies:remove', movieId),
  playMovie: (movieId, options) => ipcRenderer.invoke('movies:play', movieId, options),
  toggleMovieCompleted: (movieId, completed) =>
    ipcRenderer.invoke('movies:toggle-completed', movieId, completed),
  resetMovieProgress: (movieId) => ipcRenderer.invoke('movies:reset-progress', movieId),
  searchTmdb: (query, year) => ipcRenderer.invoke('tmdb:search', query, year),
  fixMovieMatch: (movieId, tmdbId) => ipcRenderer.invoke('movies:fix-match', movieId, tmdbId),

  // Subtitle Sync
  autoSyncSubtitle: (seriesId, episodeId) =>
    ipcRenderer.invoke('subsync:auto-sync', seriesId, episodeId),
  autoSyncMovieSubtitle: (movieId) => ipcRenderer.invoke('subsync:auto-sync-movie', movieId),
  nudgeSubtitleDelay: (seriesId, episodeId, deltaSec, applyToSeason) =>
    ipcRenderer.invoke('subsync:nudge', seriesId, episodeId, deltaSec, applyToSeason),
  nudgeMovieSubtitleDelay: (movieId, deltaSec) =>
    ipcRenderer.invoke('subsync:nudge-movie', movieId, deltaSec),
  resetSubtitleDelay: (seriesId, episodeId) =>
    ipcRenderer.invoke('subsync:reset', seriesId, episodeId),
  resetMovieSubtitleDelay: (movieId) => ipcRenderer.invoke('subsync:reset-movie', movieId),
  getSubtitleDelay: () => ipcRenderer.invoke('subsync:get-delay'),

  searchAniList: (query) => ipcRenderer.invoke('anilist:search', query),
  validateAniListToken: (token) => ipcRenderer.invoke('anilist:validate-token', token),
  linkAniListMedia: (seriesId, media) =>
    ipcRenderer.invoke('anilist:link-series', seriesId, media),
  unlinkAniListMedia: (seriesId) => ipcRenderer.invoke('anilist:unlink-series', seriesId),
  queueThumbnails: (seriesId) => ipcRenderer.invoke('thumbnails:queue-series', seriesId),

  onVlcProgressUpdate: (callback) => {
    const handler = (_event: any, data: VlcStateUpdate): void => callback(data)
    ipcRenderer.on('vlc:progress-update', handler)
    return () => {
      ipcRenderer.removeListener('vlc:progress-update', handler)
    }
  },
  onVlcStopped: (callback) => {
    const handler = (_event: any, data: any): void => callback(data)
    ipcRenderer.on('vlc:stopped', handler)
    return () => {
      ipcRenderer.removeListener('vlc:stopped', handler)
    }
  },
  onThumbnailGenerated: (callback) => {
    const handler = (_event: any, data: { id: string; isMovie?: boolean }): void => callback(data)
    ipcRenderer.on('thumbnail:generated', handler)
    return () => {
      ipcRenderer.removeListener('thumbnail:generated', handler)
    }
  },
  onNotification: (callback) => {
    const handler = (_event: any, data: AppNotification): void => callback(data)
    ipcRenderer.on('app:notification', handler)
    return () => {
      ipcRenderer.removeListener('app:notification', handler)
    }
  },
  onSeriesUpdated: (callback) => {
    const handler = (_event: any, data: Series): void => callback(data)
    ipcRenderer.on('series:updated', handler)
    return () => {
      ipcRenderer.removeListener('series:updated', handler)
    }
  },
  onMovieUpdated: (callback) => {
    const handler = (_event: any, data: Movie): void => callback(data)
    ipcRenderer.on('movie:updated', handler)
    return () => {
      ipcRenderer.removeListener('movie:updated', handler)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.api = api
}
