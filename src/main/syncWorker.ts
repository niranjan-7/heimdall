import { BrowserWindow } from 'electron'
import * as path from 'path'
import { Series, Episode, VlcStateUpdate, AppSettings } from '../shared/types'
import { StorageService } from './storageService'

export class SyncWorker {
  private timer: NodeJS.Timeout | null = null
  private storageService: StorageService
  private activeSeries: Series | null = null
  private activeEpisode: Episode | null = null
  private getMainWindow: () => BrowserWindow | null
  private consecutiveErrors = 0

  constructor(storageService: StorageService, getMainWindow: () => BrowserWindow | null) {
    this.storageService = storageService
    this.getMainWindow = getMainWindow
  }

  public start(series: Series, initialEpisode: Episode): void {
    this.stop()
    this.activeSeries = series
    this.activeEpisode = initialEpisode
    this.consecutiveErrors = 0

    // Poll every 1500ms
    this.timer = setInterval(() => {
      this.pollVlcStatus().catch((err) => {
        // Silently tolerate initial connection attempts while VLC launches
        this.consecutiveErrors++
      })
    }, 1500)
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    // Flush any pending changes to library
    this.storageService.saveLibrary()

    // Notify renderer that VLC is stopped
    const win = this.getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('vlc:stopped', {
        seriesId: this.activeSeries ? this.activeSeries.id : null,
        episodeId: this.activeEpisode ? this.activeEpisode.id : null
      })
    }

    this.activeSeries = null
    this.activeEpisode = null
    this.consecutiveErrors = 0
  }

  private async pollVlcStatus(): Promise<void> {
    if (!this.activeSeries) return

    const settings = this.storageService.getSettings()
    const url = `http://127.0.0.1:${settings.httpPort}/requests/status.json`
    const authHeader = 'Basic ' + Buffer.from(':' + settings.httpPassword).toString('base64')

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1200)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: authHeader
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return
      }

      const data = await response.json()
      this.consecutiveErrors = 0
      this.handleVlcData(data, settings)
    } catch {
      this.consecutiveErrors++
    }
  }

  private handleVlcData(data: any, settings: AppSettings): void {
    if (!this.activeSeries) return

    const state: 'playing' | 'paused' | 'stopped' =
      data.state === 'playing' ? 'playing' : data.state === 'paused' ? 'paused' : 'stopped'

    const currentTime = Math.floor(Number(data.time) || 0)
    const duration = Math.floor(Number(data.length) || 0)

    // Extract filename from VLC metadata
    const meta = data.information?.category?.meta
    const vlcFilename = meta?.filename || ''
    const vlcUrl = meta?.url || ''

    // Resolve matching episode from the series
    const matchedEpisode = this.matchEpisode(vlcFilename, vlcUrl)
    if (matchedEpisode) {
      this.activeEpisode = matchedEpisode
    }

    const currentEp = this.activeEpisode
    let isCompleted = false

    if (currentEp && (state === 'playing' || state === 'paused') && currentTime > 2) {
      const threshold = settings.completionThreshold || 0.9
      isCompleted = duration > 0 ? currentTime / duration >= threshold : false

      // Update episode in storage
      this.storageService.updateEpisodeProgress(this.activeSeries.id, currentEp.id, {
        timeSec: currentTime,
        durationSec: duration > 0 ? duration : currentEp.durationSec,
        completed: isCompleted || currentEp.completed,
        lastWatchedAt: Date.now()
      })
    }

    // Emit live IPC event to React renderer
    const win = this.getMainWindow()
    if (win && !win.isDestroyed()) {
      const update: VlcStateUpdate = {
        isRunning: true,
        seriesId: this.activeSeries.id,
        episodeId: currentEp ? currentEp.id : null,
        filePath: currentEp ? currentEp.filePath : null,
        filename: currentEp ? currentEp.fileName : vlcFilename,
        state,
        currentTime,
        duration,
        completed: currentEp ? currentEp.completed || isCompleted : false
      }
      win.webContents.send('vlc:progress-update', update)
    }
  }

  private matchEpisode(vlcFilename: string, vlcUrl: string): Episode | null {
    if (!this.activeSeries) return null

    // Decode URL if present (e.g. file:///C:/path/to/ep.mkv)
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

    // 1. Try matching by exact filename or URL basename
    for (const ep of this.activeSeries.episodes) {
      const epBase = path.basename(ep.filePath).toLowerCase()
      if (cleanVlcFile && epBase === cleanVlcFile) return ep
      if (cleanUrlFile && epBase === cleanUrlFile) return ep
    }

    // 2. Try matching by full path containment
    for (const ep of this.activeSeries.episodes) {
      const epNorm = path.normalize(ep.filePath).toLowerCase()
      if (decodedUrl && epNorm.includes(path.normalize(decodedUrl).toLowerCase())) return ep
      if (vlcFilename && epNorm.includes(path.normalize(vlcFilename).toLowerCase())) return ep
    }

    // Fallback to active episode if no match
    return this.activeEpisode
  }
}
