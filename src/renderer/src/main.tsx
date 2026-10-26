import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Browser fallback shim if opened directly in a web browser instead of Electron
if (typeof window !== 'undefined' && !window.api) {
  console.warn('Heimdall is running outside Electron context (standard browser mode).')
  // @ts-ignore
  window.api = {
    getLibrary: async () => ({ series: [], movies: [] }),
    getSettings: async () => ({
      vlcPath: 'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
      mpvPath: 'C:\\Program Files\\mpv\\mpv.exe',
      preferredPlayer: 'vlc',
      enableAnime4K: false,
      anime4kPreset: 'hq_lanczos',
      mpvCustomArgs: '',
      completionThreshold: 0.9,
      httpPort: 42120,
      httpPassword: 'heimdall_secret',
      enableDiscordRPC: true,
      discordClientId: '1343981881774346332',
      enableAniListScrobble: true,
      enableThumbnails: true
    }),
    saveSettings: async (s: any) => s,
    selectFolder: async () => null,
    selectVlcExecutable: async () => null,
    selectMpvExecutable: async () => null,
    detectPlayers: async () => ({ vlc: null, mpv: null }),
    addSeries: async () => ({} as any),
    addSeasonToSeries: async () => ({} as any),
    rescanSeries: async () => ({} as any),
    removeSeries: async () => true,
    toggleEpisodeCompleted: async () => null,
    resetEpisodeProgress: async () => null,
    playVlc: async () => ({
      success: false,
      message: 'Native desktop app required to control local VLC.'
    }),
    stopVlc: async () => {},
    scanMoviesFolder: async () => [],
    removeMovie: async () => true,
    playMovie: async () => ({
      success: false,
      message: 'Native desktop app required to control local VLC.'
    }),
    toggleMovieCompleted: async () => null,
    resetMovieProgress: async () => null,
    searchTmdb: async () => [],
    fixMovieMatch: async () => ({} as any),
    autoSyncSubtitle: async () => ({
      success: false,
      offsetSec: 0,
      message: 'Desktop app required'
    }),
    autoSyncMovieSubtitle: async () => ({
      success: false,
      offsetSec: 0,
      message: 'Desktop app required'
    }),
    nudgeSubtitleDelay: async () => ({ currentDelay: 0 }),
    nudgeMovieSubtitleDelay: async () => ({ currentDelay: 0 }),
    resetSubtitleDelay: async () => ({ currentDelay: 0 }),
    resetMovieSubtitleDelay: async () => ({ currentDelay: 0 }),
    getSubtitleDelay: async () => 0,
    downloadSubtitle: async () => ({
      success: false,
      source: 'none',
      language: 'en',
      message: 'Desktop app required'
    }),
    downloadMovieSubtitle: async () => ({
      success: false,
      source: 'none',
      language: 'en',
      message: 'Desktop app required'
    }),
    scanLocalSubtitles: async () => ({ found: false }),
    getRemoteServerInfo: async () => ({
      enabled: true,
      port: 42125,
      localIp: '192.168.1.100',
      url: 'http://192.168.1.100:42125',
      qrCodeDataUrl: '',
      connectedClients: 0
    }),
    searchAniList: async () => [],
    validateAniListToken: async () => ({ success: false }),
    linkAniListMedia: async () => ({} as any),
    unlinkAniListMedia: async () => ({} as any),
    queueThumbnails: async () => {},
    onVlcProgressUpdate: () => () => {},
    onVlcStopped: () => () => {},
    onThumbnailGenerated: () => () => {},
    onNotification: () => () => {},
    onSeriesUpdated: () => () => {},
    onMovieUpdated: () => () => {}
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
