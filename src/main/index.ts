import { app, shell, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join, basename } from 'path'
import { pathToFileURL } from 'url'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { StorageService } from './storageService'
import { SyncWorker } from './syncWorker'
import { VlcController } from './vlcController'
import { ThumbnailService } from './thumbnailService'
import { DiscordService } from './discordService'
import { AniListService } from './anilistService'
import { FillerService } from './fillerService'
import { SubtitleSyncService } from './subtitleSyncService'
import { SubtitleDownloadService } from './subtitleDownloadService'
import { RemoteServer } from './remoteServer'
import { TmdbService } from './tmdbService'
import { UpdateService } from './updateService'
import { scanSeriesFolders } from './folderScanner'
import { scanMoviesFolder } from './movieScanner'
import { Series, Movie } from '../shared/types'

// Register privileged custom scheme for video thumbnails
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'heimdall-thumb',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true
    }
  }
])

let mainWindow: BrowserWindow | null = null
let storageService: StorageService
let syncWorker: SyncWorker
let vlcController: VlcController
let thumbnailService: ThumbnailService
let discordService: DiscordService
let anilistService: AniListService
let fillerService: FillerService
let subtitleSyncService: SubtitleSyncService
let subtitleDownloadService: SubtitleDownloadService
let remoteServer: RemoteServer
let tmdbService: TmdbService
let updateService: UpdateService

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1040,
    minHeight: 720,
    show: true,
    autoHideMenuBar: true,
    title: 'Heimdall',
    icon:
      process.platform === 'win32'
        ? join(__dirname, '../../build/icon.ico')
        : join(__dirname, '../../build/icon.png'),
    transparent: true,
    backgroundColor: '#00000000',
    backgroundMaterial: 'acrylic',
    vibrancy: 'under-window',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      if (process.platform === 'win32') {
        try {
          mainWindow.setBackgroundMaterial('acrylic')
        } catch {}
      }
      mainWindow.show()
      mainWindow.focus()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerCustomProtocols(): void {
  protocol.handle('heimdall-thumb', async (request) => {
    try {
      const parsed = new URL(request.url)
      const id = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''))
      const thumbPath = thumbnailService.getThumbnailPath(id)
      if (fs.existsSync(thumbPath)) {
        return await net.fetch(pathToFileURL(thumbPath).toString())
      }
    } catch (e) {
      console.error('Thumbnail protocol error:', e)
    }
    return new Response('Not found', { status: 404 })
  })
}

async function syncSeriesToAniList(
  seriesId: string,
  notify = true
): Promise<{ success: boolean; progress?: number; message?: string }> {
  try {
    const series = storageService.getSeries(seriesId)
    if (!series) return { success: false, message: 'Series not found' }
    if (!series.aniListId) return { success: false, message: 'Series is not linked to AniList' }

    const settings = storageService.getSettings()
    if (!settings.enableAniListScrobble || !settings.aniListToken) {
      return {
        success: false,
        message: 'AniList scrobbling is not enabled or no token configured in Settings'
      }
    }

    const completedEpisodes = series.episodes.filter((e) => e.completed && e.episodeNumber !== null)
    if (completedEpisodes.length === 0) {
      return { success: false, message: 'No completed episodes found to sync' }
    }

    const maxEp = Math.max(...completedEpisodes.map((e) => e.episodeNumber!))
    const res = await anilistService.scrobbleProgress(series.aniListId, maxEp, settings.aniListToken)

    if (notify && mainWindow && !mainWindow.isDestroyed()) {
      if (res.success) {
        mainWindow.webContents.send('app:notification', {
          type: 'success',
          message: `🎉 Synced ${series.aniListTitle || series.title} (Ep ${maxEp}) to AniList!`
        })
      } else {
        mainWindow.webContents.send('app:notification', {
          type: 'error',
          message: `AniList sync failed: ${res.error || 'Unknown error'}`
        })
      }
    }

    return { success: res.success, progress: maxEp, message: res.error }
  } catch (err: any) {
    if (notify && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:notification', {
        type: 'error',
        message: `AniList sync failed: ${err?.message || 'Unexpected error'}`
      })
    }
    return { success: false, message: err?.message || 'Unexpected error' }
  }
}

async function syncAllSeriesToAniList(): Promise<{
  success: boolean
  count: number
  message?: string
}> {
  try {
    const library = storageService.getLibrary()
    const settings = storageService.getSettings()
    if (!settings.enableAniListScrobble || !settings.aniListToken) {
      return {
        success: false,
        count: 0,
        message: 'AniList scrobbling is disabled or token is missing.'
      }
    }

    const linkedSeries = library.series.filter(
      (s) => s.aniListId && s.episodes.some((e) => e.completed && e.episodeNumber !== null)
    )

    if (linkedSeries.length === 0) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app:notification', {
          type: 'info',
          message: 'No watched series currently linked to AniList.'
        })
      }
      return {
        success: true,
        count: 0,
        message: 'No watched series currently linked to AniList.'
      }
    }

    let successCount = 0
    for (const s of linkedSeries) {
      const res = await syncSeriesToAniList(s.id, false)
      if (res.success) {
        successCount++
      }
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:notification', {
        type: 'success',
        message: `🎉 Synced ${successCount} series to your AniList account!`
      })
    }

    return { success: true, count: successCount }
  } catch (err: any) {
    return { success: false, count: 0, message: err?.message || 'Failed to sync series' }
  }
}

async function syncSeriesFillerData(
  seriesId: string,
  notify = false
): Promise<Series | null> {
  try {
    const series = storageService.getSeries(seriesId)
    if (!series) return null

    const enriched = await fillerService.enrichSeries(series)
    storageService.addOrUpdateSeries(enriched)

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('series:updated', enriched)
      if (notify) {
        const stats = enriched.fillerStats
        if (stats) {
          mainWindow.webContents.send('app:notification', {
            type: 'success',
            message: `🍃 Loaded filler guide for ${enriched.aniListTitle || enriched.title} (${stats.fillerCount} filler episodes identified)`
          })
        } else {
          mainWindow.webContents.send('app:notification', {
            type: 'info',
            message: `No filler breakdown found for ${enriched.aniListTitle || enriched.title}`
          })
        }
      }
    }

    return enriched
  } catch (err: any) {
    console.error('[FillerService] Error syncing filler data:', err)
    if (notify && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app:notification', {
        type: 'error',
        message: `Failed to load filler guide: ${err?.message || 'Error'}`
      })
    }
    return null
  }
}

function registerIpcHandlers(): void {
  // Storage
  ipcMain.handle('storage:get-library', () => {
    return storageService.getLibrary()
  })

  ipcMain.handle('storage:get-settings', () => {
    return storageService.getSettings()
  })

  ipcMain.handle('storage:save-settings', async (_event, settings) => {
    const updated = storageService.saveSettings(settings)
    if (updated.enableDiscordRPC) {
      discordService.connect().catch(() => {})
    } else {
      discordService.disconnect()
    }
    return updated
  })

  // Discord RPC Status
  ipcMain.handle('discord:get-status', () => {
    return discordService.getStatus()
  })

  ipcMain.handle('discord:reconnect', async () => {
    await discordService.connect()
    return discordService.getStatus()
  })

  // Dialogs
  ipcMain.handle('dialog:select-folder', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Folder'
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  ipcMain.handle('dialog:select-vlc-executable', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      title: 'Select VLC Executable (vlc.exe)',
      filters: [
        { name: 'VLC Media Player', extensions: ['exe', 'app', ''] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  ipcMain.handle('dialog:select-mpv-executable', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      title: 'Select mpv Executable (mpv.exe)',
      filters: [
        { name: 'mpv Media Player', extensions: ['exe', 'app', ''] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  ipcMain.handle('player:detect-executables', () => {
    return {
      vlc: storageService.detectVlcPath() || null,
      mpv: storageService.detectMpvPath() || null
    }
  })

  // Series Operations
  ipcMain.handle('series:add', async (_event, folderPath: string) => {
    const { episodes, title } = scanSeriesFolders(folderPath)
    const newSeries: Series = {
      id: `series_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      rootPath: folderPath,
      additionalPaths: [],
      episodes,
      lastActiveEpisodeId: episodes.length > 0 ? episodes[0].id : null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    storageService.addOrUpdateSeries(newSeries)
    thumbnailService.queueSeries(newSeries)

    anilistService.searchAnime(title).then((results) => {
      if (results.length > 0) {
        const top = results[0]
        newSeries.aniListId = top.id
        newSeries.coverImage = top.coverImage?.extraLarge || top.coverImage?.large
        newSeries.bannerImage = top.bannerImage
        const animeTitle = top.title.english || top.title.romaji
        newSeries.aniListTitle = animeTitle
        if (animeTitle) {
          newSeries.title = animeTitle
        }
        storageService.addOrUpdateSeries(newSeries)
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('series:updated', newSeries)
        }
      }
    })

    return newSeries
  })

  ipcMain.handle('series:add-season', async (_event, seriesId: string, folderPath: string) => {
    const series = storageService.getSeries(seriesId)
    if (!series) throw new Error('Series not found')

    if (!series.additionalPaths.includes(folderPath)) {
      series.additionalPaths.push(folderPath)
    }

    const { episodes } = scanSeriesFolders(series.rootPath, series.additionalPaths, series.episodes)
    series.episodes = episodes
    if (series.aniListTitle) {
      series.title = series.aniListTitle
    }
    series.updatedAt = Date.now()
    storageService.addOrUpdateSeries(series)

    thumbnailService.queueSeries(series)
    return series
  })

  ipcMain.handle('series:rescan', async (_event, seriesId: string) => {
    const series = storageService.getSeries(seriesId)
    if (!series) throw new Error('Series not found')

    const { episodes, title } = scanSeriesFolders(
      series.rootPath,
      series.additionalPaths,
      series.episodes
    )
    series.title = series.aniListTitle || title
    series.episodes = episodes
    series.updatedAt = Date.now()
    storageService.addOrUpdateSeries(series)

    thumbnailService.queueSeries(series)
    return series
  })

  ipcMain.handle('series:remove', (_event, seriesId: string) => {
    return storageService.removeSeries(seriesId)
  })

  // Module 2: Movies Operations
  ipcMain.handle('movies:scan-folder', async (_event, folderPath: string) => {
    const existing = storageService.getMovies()
    const scannedMovies = await scanMoviesFolder(folderPath, existing)

    // Save and queue background tasks for each movie
    for (const m of scannedMovies) {
      storageService.addOrUpdateMovie(m)
      thumbnailService.queueMovie(m)

      // Background TMDB query if missing metadata
      if (!m.tmdbId) {
        const settings = storageService.getSettings()
        tmdbService.searchMovie(m.cleanTitle, m.year, settings.tmdbApiKey).then(async (results) => {
          if (results.length > 0) {
            const top = results[0]
            const details = await tmdbService.getMovieDetails(top.id, settings.tmdbApiKey)
            m.tmdbId = top.id
            m.title = top.title
            m.posterUrl = top.poster_path
            m.backdropUrl = top.backdrop_path
            m.overview = top.overview
            m.rating = top.vote_average
            m.year = top.year || m.year
            if (details) {
              m.genres = details.genres
              m.director = details.director
            }
            storageService.addOrUpdateMovie(m)
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('movie:updated', m)
            }
          }
        })
      }
    }

    return storageService.getMovies()
  })

  ipcMain.handle('movies:remove', (_event, movieId: string) => {
    return storageService.removeMovie(movieId)
  })

  ipcMain.handle(
    'movies:play',
    async (_event, movieId: string, options?: { startTime?: number }) => {
      return await vlcController.launchMovie(movieId, options)
    }
  )

  ipcMain.handle('movies:toggle-completed', (_event, movieId: string, completed?: boolean) => {
    const movie = storageService.getMovie(movieId)
    if (!movie) return null
    const newCompleted = completed !== undefined ? completed : !movie.completed
    return storageService.updateMovieProgress(movieId, {
      completed: newCompleted,
      timeSec: newCompleted ? movie.durationSec : 0,
      lastWatchedAt: Date.now()
    })
  })

  ipcMain.handle('movies:reset-progress', (_event, movieId: string) => {
    return storageService.updateMovieProgress(movieId, {
      completed: false,
      timeSec: 0
    })
  })

  // TMDB Search & Fix Match
  ipcMain.handle('tmdb:search', async (_event, query: string, year?: number) => {
    const settings = storageService.getSettings()
    return await tmdbService.searchMovie(query, year, settings.tmdbApiKey)
  })

  ipcMain.handle('movies:fix-match', async (_event, movieId: string, tmdbId: number) => {
    const movie = storageService.getMovie(movieId)
    if (!movie) throw new Error('Movie not found')

    const settings = storageService.getSettings()
    const details = await tmdbService.getMovieDetails(tmdbId, settings.tmdbApiKey)
    if (details) {
      movie.tmdbId = details.id
      movie.title = details.title
      movie.year = details.year || movie.year
      movie.posterUrl = details.poster_path
      movie.backdropUrl = details.backdrop_path
      movie.overview = details.overview
      movie.rating = details.vote_average
      movie.genres = details.genres
      movie.director = details.director
      storageService.addOrUpdateMovie(movie)
    }

    return movie
  })

  // Module 1: Subtitle Sync IPC
  ipcMain.handle('subsync:auto-sync', async (_event, seriesId: string, episodeId: string) => {
    return await subtitleSyncService.autoSyncEpisode(seriesId, episodeId)
  })

  ipcMain.handle('subsync:auto-sync-movie', async (_event, movieId: string) => {
    return await subtitleSyncService.autoSyncMovie(movieId)
  })

  ipcMain.handle(
    'subsync:nudge',
    async (
      _event,
      seriesId: string,
      episodeId: string,
      deltaSec: number,
      applyToSeason: boolean
    ) => {
      return await subtitleSyncService.nudgeSubtitleDelay(
        seriesId,
        episodeId,
        deltaSec,
        applyToSeason
      )
    }
  )

  ipcMain.handle('subsync:nudge-movie', async (_event, movieId: string, deltaSec: number) => {
    return await subtitleSyncService.nudgeMovieSubtitleDelay(movieId, deltaSec)
  })

  ipcMain.handle('subsync:reset', async (_event, seriesId: string, episodeId: string) => {
    await subtitleSyncService.resetSubtitleDelay(seriesId, episodeId)
    return { currentDelay: 0 }
  })

  ipcMain.handle('subsync:reset-movie', async (_event, movieId: string) => {
    await subtitleSyncService.resetMovieSubtitleDelay(movieId)
    return { currentDelay: 0 }
  })

  ipcMain.handle('subsync:get-delay', () => {
    return vlcController.getSubtitleDelay()
  })

  // Module 4: Subtitle Downloader IPC
  ipcMain.handle(
    'subtitles:download-episode',
    async (_event, seriesId: string, episodeId: string, lang?: string) => {
      return await subtitleDownloadService.downloadSubtitleForEpisode(seriesId, episodeId, lang)
    }
  )

  ipcMain.handle(
    'subtitles:download-movie',
    async (_event, movieId: string, lang?: string) => {
      return await subtitleDownloadService.downloadSubtitleForMovie(movieId, lang)
    }
  )

  ipcMain.handle(
    'subtitles:scan-local',
    (_event, filePath: string, lang?: string) => {
      const found = subtitleDownloadService.findLocalSubtitle(filePath, lang)
      return { found: Boolean(found), path: found || undefined }
    }
  )

  // AniList Integration IPC
  ipcMain.handle('anilist:search', async (_event, query: string) => {
    return await anilistService.searchAnime(query)
  })

  ipcMain.handle('anilist:validate-token', async (_event, token: string) => {
    return await anilistService.validateToken(token)
  })

  // Module 5: Mobile Remote IPC
  ipcMain.handle('remote:get-info', async () => {
    return await remoteServer.getServerInfo()
  })

  ipcMain.handle(
    'anilist:link-series',
    async (
      _event,
      seriesId: string,
      media: {
        id: number
        title?: string
        coverImage?: string
        bannerImage?: string
      }
    ) => {
      const series = storageService.getSeries(seriesId)
      if (!series) throw new Error('Series not found')

      series.aniListId = media.id
      series.coverImage = media.coverImage || null
      series.bannerImage = media.bannerImage || null
      series.aniListTitle = media.title || null
      if (media.title) {
        series.title = media.title
      }
      series.updatedAt = Date.now()
      storageService.addOrUpdateSeries(series)
      syncSeriesToAniList(seriesId, true).catch(() => {})
      syncSeriesFillerData(seriesId, false).catch(() => {})
      return series
    }
  )

  ipcMain.handle('anilist:sync-series', async (_event, seriesId: string) => {
    return await syncSeriesToAniList(seriesId, true)
  })

  ipcMain.handle('anilist:sync-all', async () => {
    return await syncAllSeriesToAniList()
  })

  ipcMain.handle('filler:fetch-series', async (_event, seriesId: string) => {
    return await syncSeriesFillerData(seriesId, true)
  })

  ipcMain.handle('anilist:unlink-series', async (_event, seriesId: string) => {
    const series = storageService.getSeries(seriesId)
    if (!series) throw new Error('Series not found')

    series.aniListId = null
    series.coverImage = null
    series.bannerImage = null
    series.aniListTitle = null
    series.title = basename(series.rootPath)
    series.updatedAt = Date.now()
    storageService.addOrUpdateSeries(series)
    return series
  })

  // Thumbnails IPC
  ipcMain.handle('thumbnails:queue-series', async (_event, seriesId: string) => {
    const series = storageService.getSeries(seriesId)
    if (series) {
      thumbnailService.queueSeries(series)
    }
  })

  // Episode Operations
  ipcMain.handle(
    'episode:toggle-completed',
    (_event, seriesId: string, episodeId: string, completed?: boolean) => {
      const series = storageService.getSeries(seriesId)
      if (!series) return null
      const ep = series.episodes.find((e) => e.id === episodeId)
      if (!ep) return null

      const newCompleted = completed !== undefined ? completed : !ep.completed
      const res = storageService.updateEpisodeProgress(seriesId, episodeId, {
        completed: newCompleted,
        timeSec: newCompleted ? ep.durationSec || ep.timeSec : 0,
        lastWatchedAt: Date.now()
      })
      if (newCompleted) {
        syncSeriesToAniList(seriesId, true).catch(() => {})
      }
      return res
    }
  )

  ipcMain.handle('episode:reset-progress', (_event, seriesId: string, episodeId: string) => {
    return storageService.updateEpisodeProgress(seriesId, episodeId, {
      completed: false,
      timeSec: 0
    })
  })

  // Batch Episode Actions & Cleaner
  ipcMain.handle(
    'episode:batch-update',
    (
      _event,
      seriesId: string,
      episodeIds: string[],
      update: { completed?: boolean; resetProgress?: boolean }
    ) => {
      const res = storageService.batchUpdateEpisodes(seriesId, episodeIds, update)
      if (update.completed) {
        syncSeriesToAniList(seriesId, true).catch(() => {})
      }
      return res
    }
  )

  ipcMain.handle(
    'episode:normalize-titles',
    (_event, seriesId: string, episodeIds?: string[]) => {
      return storageService.batchNormalizeEpisodeTitles(seriesId, episodeIds)
    }
  )

  ipcMain.handle(
    'episode:mark-prior-watched',
    (_event, seriesId: string, targetEpisodeId: string) => {
      const res = storageService.markEpisodesPriorTo(seriesId, targetEpisodeId)
      syncSeriesToAniList(seriesId, true).catch(() => {})
      return res
    }
  )

  // In-App Update Handlers
  ipcMain.handle('update:check', async () => {
    return await updateService.checkForUpdates()
  })

  ipcMain.handle(
    'update:download-install',
    async (_event, downloadUrl: string, assetName?: string) => {
      return await updateService.downloadAndInstallUpdate(downloadUrl, assetName)
    }
  )

  ipcMain.handle('storage:create-backup', () => {
    return updateService.createBackup()
  })

  // VLC Controls
  ipcMain.handle(
    'vlc:play',
    async (
      _event,
      seriesId: string,
      episodeId?: string,
      options?: { advanceIfCompleted?: boolean; startTime?: number }
    ) => {
      return await vlcController.launchSeries(seriesId, episodeId, options)
    }
  )

  ipcMain.handle('vlc:stop', async () => {
    await vlcController.stopCurrentProcess()
  })
}

// Electron lifecycle
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.heimdall.vlc')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize services
  storageService = new StorageService()
  discordService = new DiscordService(storageService)
  anilistService = new AniListService()
  fillerService = new FillerService()
  thumbnailService = new ThumbnailService(storageService)
  syncWorker = new SyncWorker(storageService, discordService, anilistService, () => mainWindow)
  vlcController = new VlcController(storageService, syncWorker)
  subtitleSyncService = new SubtitleSyncService(storageService, vlcController)
  subtitleDownloadService = new SubtitleDownloadService(storageService, subtitleSyncService)
  tmdbService = new TmdbService()
  updateService = new UpdateService(() => mainWindow)
  remoteServer = new RemoteServer(storageService, vlcController, thumbnailService)
  remoteServer.start()

  syncWorker.setOnStateChange((state) => {
    remoteServer.broadcastState(state)
  })

  thumbnailService.setCallback((id, isMovie) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('thumbnail:generated', { id, isMovie })
    }
  })

  discordService.connect().catch(() => {})
  registerCustomProtocols()
  registerIpcHandlers()
  createWindow()

  // Queue initial thumbnails
  const lib = storageService.getLibrary()
  for (const s of lib.series) {
    thumbnailService.queueSeries(s)
  }
  thumbnailService.queueMovies(lib.movies)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  if (remoteServer) {
    remoteServer.stop()
  }
  if (discordService) {
    discordService.disconnect()
  }
  if (vlcController) {
    await vlcController.stopCurrentProcess()
  }
})
