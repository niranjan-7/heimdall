import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { StorageService } from './storageService'
import { SyncWorker } from './syncWorker'
import { VlcController } from './vlcController'
import { scanSeriesFolders } from './folderScanner'
import { Series } from '../shared/types'

let mainWindow: BrowserWindow | null = null
let storageService: StorageService
let syncWorker: SyncWorker
let vlcController: VlcController

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
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

function registerIpcHandlers(): void {
  // Storage
  ipcMain.handle('storage:get-library', () => {
    return storageService.getLibrary()
  })

  ipcMain.handle('storage:get-settings', () => {
    return storageService.getSettings()
  })

  ipcMain.handle('storage:save-settings', (_event, settings) => {
    return storageService.saveSettings(settings)
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
    return series
  })

  ipcMain.handle('series:remove', (_event, seriesId: string) => {
    return storageService.removeSeries(seriesId)
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
  syncWorker = new SyncWorker(storageService, () => mainWindow)
  vlcController = new VlcController(storageService, syncWorker)

  registerIpcHandlers()
  createWindow()

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
  if (vlcController) {
    await vlcController.stopCurrentProcess()
  }
})
