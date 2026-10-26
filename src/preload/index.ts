import { contextBridge, ipcRenderer } from 'electron'
import {
  AppSettings,
  LibraryData,
  Series,
  Episode,
  VlcStateUpdate,
  AniListMediaInfo,
  AppNotification
} from '../shared/types'

export interface IElectronAPI {
  getLibrary: () => Promise<LibraryData>
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>
  selectFolder: () => Promise<string | null>
  selectVlcExecutable: () => Promise<string | null>
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
    callback: (info: { seriesId: string | null; episodeId: string | null }) => void
  ) => () => void
  onThumbnailGenerated: (
    callback: (info: { seriesId: string; episodeId: string }) => void
  ) => () => void
  onNotification: (callback: (notification: AppNotification) => void) => () => void
  onSeriesUpdated: (callback: (series: Series) => void) => () => void
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
    const handler = (_event: any, data: { seriesId: string; episodeId: string }): void =>
      callback(data)
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
