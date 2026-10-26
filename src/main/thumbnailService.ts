import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { spawn } from 'child_process'
import { Series, Episode } from '../shared/types'
import { StorageService } from './storageService'

// @ts-ignore
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

export class ThumbnailService {
  private thumbnailsDir: string
  private ffmpegPath: string
  private queue: { filePath: string; episodeId: string; seriesId: string }[] = []
  private isProcessing = false
  private storageService: StorageService
  private onThumbnailGenerated?: (seriesId: string, episodeId: string) => void

  constructor(storageService: StorageService) {
    this.storageService = storageService
    this.thumbnailsDir = path.join(app.getPath('userData'), 'thumbnails')
    if (!fs.existsSync(this.thumbnailsDir)) {
      fs.mkdirSync(this.thumbnailsDir, { recursive: true })
    }

    this.ffmpegPath = ffmpegInstaller.path || 'ffmpeg'
  }

  public setCallback(callback: (seriesId: string, episodeId: string) => void): void {
    this.onThumbnailGenerated = callback
  }

  public getThumbnailPath(episodeId: string): string {
    const safeId = episodeId.replace(/[^a-zA-Z0-9_-]/g, '_')
    return path.join(this.thumbnailsDir, `${safeId}.jpg`)
  }

  public hasThumbnail(episodeId: string): boolean {
    const thumbPath = this.getThumbnailPath(episodeId)
    return fs.existsSync(thumbPath)
  }

  public async generateThumbnail(filePath: string, episodeId: string): Promise<boolean> {
    const outPath = this.getThumbnailPath(episodeId)
    if (fs.existsSync(outPath)) {
      return true
    }

    if (!fs.existsSync(filePath)) {
      return false
    }

    // Try at 3 minutes (180s) first
    let success = await this.runFfmpeg(filePath, outPath, '00:03:00')
    if (!success) {
      // Fallback to 30 seconds
      success = await this.runFfmpeg(filePath, outPath, '00:00:30')
    }
    if (!success) {
      // Fallback to 5 seconds
      success = await this.runFfmpeg(filePath, outPath, '00:00:05')
    }

    return success
  }

  private runFfmpeg(inputPath: string, outputPath: string, seekTime: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const args = [
          '-ss',
          seekTime,
          '-i',
          inputPath,
          '-vframes',
          '1',
          '-vf',
          'scale=480:-1',
          '-q:v',
          '3',
          outputPath,
          '-y'
        ]

        const child = spawn(this.ffmpegPath, args, { stdio: 'ignore', windowsHide: true })

        child.on('error', () => {
          resolve(false)
        })

        child.on('close', (code) => {
          resolve(code === 0 && fs.existsSync(outputPath))
        })
      } catch {
        resolve(false)
      }
    })
  }

  public queueSeries(series: Series): void {
    const settings = this.storageService.getSettings()
    if (!settings.enableThumbnails) return

    for (const ep of series.episodes) {
      if (!this.hasThumbnail(ep.id)) {
        // Only queue if not already in queue
        if (!this.queue.some((item) => item.episodeId === ep.id)) {
          this.queue.push({
            filePath: ep.filePath,
            episodeId: ep.id,
            seriesId: series.id
          })
        }
      } else if (!ep.hasThumbnail) {
        ep.hasThumbnail = true
      }
    }

    this.processQueue()
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return
    this.isProcessing = true

    while (this.queue.length > 0) {
      const item = this.queue.shift()
      if (!item) break

      const success = await this.generateThumbnail(item.filePath, item.episodeId)
      if (success) {
        this.storageService.updateEpisodeProgress(item.seriesId, item.episodeId, {
          hasThumbnail: true
        })

        if (this.onThumbnailGenerated) {
          this.onThumbnailGenerated(item.seriesId, item.episodeId)
        }
      }

      // Small throttle between renders to keep system completely responsive
      await new Promise((r) => setTimeout(r, 60))
    }

    this.isProcessing = false
  }
}
