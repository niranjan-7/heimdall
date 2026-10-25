import { contextBridge, ipcRenderer } from 'electron'
import { AppSettings, LibraryData, Series, Episode, VlcStateUpdate } from '../shared/types'

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
  toggleEpisodeCompleted: (seriesId: string, episodeId: string, completed?: boolean) => Promise<Episode | null>
  resetEpisodeProgress: (seriesId: string, episodeId: string) => Promise<Episode | null>
  playVlc: (
    seriesId: string,
    episodeId?: string,
    options?: { advanceIfCompleted?: boolean; startTime?: number }
  ) => Promise<{ success: boolean; message?: string }>
  stopVlc: () => Promise<void>
  onVlcProgressUpdate: (callback: (update: VlcStateUpdate) => void) => () => void
  onVlcStopped: (callback: (info: { seriesId: string | null; episodeId: string | null }) => void) => () => void
}

const api: IElectronAPI = {
  getLibrary: () => ipcRenderer.invoke('storage:get-library'),
  getSettings: () => ipcRenderer.invoke('storage:get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('storage:save-settings', settings),
  selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),
  selectVlcExecutable: () => ipcRenderer.invoke('dialog:select-vlc-executable'),
  addSeries: (folderPath) => ipcRenderer.invoke('series:add', folderPath),
  addSeasonToSeries: (seriesId, folderPath) => ipcRenderer.invoke('series:add-season', seriesId, folderPath),
  rescanSeries: (seriesId) => ipcRenderer.invoke('series:rescan', seriesId),
  removeSeries: (seriesId) => ipcRenderer.invoke('series:remove', seriesId),
  toggleEpisodeCompleted: (seriesId, episodeId, completed) =>
    ipcRenderer.invoke('episode:toggle-completed', seriesId, episodeId, completed),
  resetEpisodeProgress: (seriesId, episodeId) =>
    ipcRenderer.invoke('episode:reset-progress', seriesId, episodeId),
  playVlc: (seriesId, episodeId, options) => ipcRenderer.invoke('vlc:play', seriesId, episodeId, options),
  stopVlc: () => ipcRenderer.invoke('vlc:stop'),
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
