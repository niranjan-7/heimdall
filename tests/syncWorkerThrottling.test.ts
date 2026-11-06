import { describe, expect, it, vi, beforeEach } from 'vitest'
import { SyncWorker } from '../src/main/syncWorker'
import { Series } from '../src/shared/types'

describe('SyncWorker memory throttling and IPC suspension', () => {
  let mockWindow: {
    isDestroyed: () => boolean
    isMinimized: () => boolean
    isVisible: () => boolean
    webContents: {
      send: ReturnType<typeof vi.fn>
    }
  }

  let mockStorageService: any
  let mockDiscordService: any
  let mockAniListService: any
  let syncWorker: SyncWorker

  const testSeries: Series = {
    id: 'series-1',
    title: 'Test Anime',
    rootPath: '/media/anime',
    additionalPaths: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastActiveEpisodeId: 'ep-1',
    episodes: [
      {
        id: 'ep-1',
        episodeNumber: 1,
        title: 'Episode 1',
        seasonName: 'Season 1',
        seasonFolder: 'Season 1',
        filePath: '/media/anime/ep1.mkv',
        fileName: 'ep1.mkv',
        durationSec: 1400,
        timeSec: 0,
        completed: false,
        lastWatchedAt: null
      }
    ]
  }

  beforeEach(() => {
    mockWindow = {
      isDestroyed: () => false,
      isMinimized: () => false,
      isVisible: () => true,
      webContents: {
        send: vi.fn()
      }
    }

    mockStorageService = {
      getSettings: () => ({ completionThreshold: 0.9 }),
      saveLibrary: vi.fn(),
      updateEpisodeProgress: vi.fn(),
      updateMovieProgress: vi.fn()
    }

    mockDiscordService = {
      updateActivity: vi.fn().mockResolvedValue(undefined),
      clearActivity: vi.fn().mockResolvedValue(undefined)
    }

    mockAniListService = {}

    syncWorker = new SyncWorker(
      mockStorageService,
      mockDiscordService,
      mockAniListService,
      () => mockWindow as any
    )
  })

  it('sends IPC progress update when window is visible and unminimized', () => {
    syncWorker.start(testSeries, testSeries.episodes[0], 'mpv')

    syncWorker.handleTelemetryUpdate({
      currentTime: 100,
      duration: 1400,
      state: 'playing',
      filename: 'ep1.mkv',
      playerType: 'mpv'
    })

    expect(mockWindow.webContents.send).toHaveBeenCalledWith('vlc:progress-update', expect.objectContaining({
      currentTime: 100,
      state: 'playing'
    }))
    expect(syncWorker.getPendingProgressSync()).toBe(false)
  })

  it('suspends IPC progress update when window is minimized', () => {
    mockWindow.isMinimized = () => true

    syncWorker.start(testSeries, testSeries.episodes[0], 'mpv')

    syncWorker.handleTelemetryUpdate({
      currentTime: 150,
      duration: 1400,
      state: 'playing',
      filename: 'ep1.mkv',
      playerType: 'mpv'
    })

    expect(mockWindow.webContents.send).not.toHaveBeenCalledWith('vlc:progress-update', expect.anything())
    expect(syncWorker.getPendingProgressSync()).toBe(true)
  })

  it('suspends IPC progress update when window is hidden', () => {
    mockWindow.isVisible = () => false

    syncWorker.start(testSeries, testSeries.episodes[0], 'mpv')

    syncWorker.handleTelemetryUpdate({
      currentTime: 200,
      duration: 1400,
      state: 'playing',
      filename: 'ep1.mkv',
      playerType: 'mpv'
    })

    expect(mockWindow.webContents.send).not.toHaveBeenCalledWith('vlc:progress-update', expect.anything())
    expect(syncWorker.getPendingProgressSync()).toBe(true)
  })

  it('flushes deferred progress update when window is restored', () => {
    mockWindow.isMinimized = () => true
    syncWorker.start(testSeries, testSeries.episodes[0], 'mpv')
    mockWindow.webContents.send.mockClear()

    syncWorker.handleTelemetryUpdate({
      currentTime: 300,
      duration: 1400,
      state: 'playing',
      filename: 'ep1.mkv',
      playerType: 'mpv'
    })

    expect(mockWindow.webContents.send).not.toHaveBeenCalledWith('vlc:progress-update', expect.anything())
    expect(syncWorker.getPendingProgressSync()).toBe(true)

    // Window restored
    mockWindow.isMinimized = () => false
    mockWindow.isVisible = () => true
    syncWorker.flushPendingProgress()

    expect(mockWindow.webContents.send).toHaveBeenCalledWith('vlc:progress-update', expect.objectContaining({
      currentTime: 300
    }))
    expect(syncWorker.getPendingProgressSync()).toBe(false)
  })

  it('clears pending sync and sends stopped event when playback ends', () => {
    mockWindow.isMinimized = () => true
    syncWorker.start(testSeries, testSeries.episodes[0], 'mpv')

    syncWorker.handleTelemetryUpdate({
      currentTime: 400,
      duration: 1400,
      state: 'playing',
      filename: 'ep1.mkv',
      playerType: 'mpv'
    })

    expect(syncWorker.getPendingProgressSync()).toBe(true)

    syncWorker.stop()

    expect(syncWorker.getPendingProgressSync()).toBe(false)
    expect(mockWindow.webContents.send).toHaveBeenCalledWith('vlc:stopped', expect.anything())
  })
})
