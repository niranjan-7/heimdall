import { app, shell, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { StorageService } from './storageService'
import { SyncWorker } from './syncWorker'
import { VlcController } from './vlcController'
import { ThumbnailService } from './thumbnailService'
import { DiscordService } from './discordService'
import { AniListService } from './anilistService'
import { SubtitleSyncService } from './subtitleSyncService'
import { scanSeriesFolders } from './folderScanner'
import { Series } from '../shared/types'

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
let subtitleSyncService: SubtitleSyncService

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 1040,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: 'Heimdall',
    backgroundColor: '#09090b',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()
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
      const episodeId = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''))
      const thumbPath = thumbnailService.getThumbnailPath(episodeId)
      if (fs.existsSync(thumbPath)) {
        return await net.fetch(pathToFileURL(thumbPath).toString())
      }
    } catch (e) {
      console.error('Thumbnail protocol error:', e)
    }
    return new Response('Not found', { status: 404 })
  })
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

  // Dialogs
  ipcMain.handle('dialog:select-folder', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Series or Season Folder'
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
      filters: [{ name: 'VLC Media Player', extensions: ['exe'] }]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
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
        newSeries.aniListTitle = top.title.english || top.title.romaji
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
    series.title = title
    series.episodes = episodes
    series.updatedAt = Date.now()
    storageService.addOrUpdateSeries(series)

    thumbnailService.queueSeries(series)
    return series
  })

  ipcMain.handle('series:remove', (_event, seriesId: string) => {
    return storageService.removeSeries(seriesId)
  })

  // Module 1: Subtitle Sync IPC
  ipcMain.handle('subsync:auto-sync', async (_event, seriesId: string, episodeId: string) => {
    return await subtitleSyncService.autoSyncEpisode(seriesId, episodeId)
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

  ipcMain.handle('subsync:reset', async (_event, seriesId: string, episodeId: string) => {
    await subtitleSyncService.resetSubtitleDelay(seriesId, episodeId)
    return { currentDelay: 0 }
  })

  ipcMain.handle('subsync:get-delay', () => {
    return vlcController.getSubtitleDelay()
  })

  // AniList Integration IPC
  ipcMain.handle('anilist:search', async (_event, query: string) => {
    return await anilistService.searchAnime(query)
  })

  ipcMain.handle('anilist:validate-token', async (_event, token: string) => {
    return await anilistService.validateToken(token)
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
      series.updatedAt = Date.now()
      storageService.addOrUpdateSeries(series)
      return series
    }
  )

  ipcMain.handle('anilist:unlink-series', async (_event, seriesId: string) => {
    const series = storageService.getSeries(seriesId)
    if (!series) throw new Error('Series not found')

    series.aniListId = null
    series.coverImage = null
    series.bannerImage = null
    series.aniListTitle = null
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
      return storageService.updateEpisodeProgress(seriesId, episodeId, {
        completed: newCompleted,
        timeSec: newCompleted ? ep.durationSec || ep.timeSec : 0,
        lastWatchedAt: Date.now()
      })
    }
  )

  ipcMain.handle('episode:reset-progress', (_event, seriesId: string, episodeId: string) => {
    return storageService.updateEpisodeProgress(seriesId, episodeId, {
      completed: false,
      timeSec: 0
    })
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
  thumbnailService = new ThumbnailService(storageService)
  syncWorker = new SyncWorker(storageService, discordService, anilistService, () => mainWindow)
  vlcController = new VlcController(storageService, syncWorker)
  subtitleSyncService = new SubtitleSyncService(storageService, vlcController)

  thumbnailService.setCallback((seriesId, episodeId) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('thumbnail:generated', { seriesId, episodeId })
    }
  })

  discordService.connect().catch(() => {})
  registerCustomProtocols()
  registerIpcHandlers()
  createWindow()

  const lib = storageService.getLibrary()
  for (const s of lib.series) {
    thumbnailService.queueSeries(s)
  }

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
  if (discordService) {
    discordService.disconnect()
  }
  if (vlcController) {
    await vlcController.stopCurrentProcess()
  }
})
