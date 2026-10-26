import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { spawn } from 'child_process'
import { Series, Episode, Movie } from '../shared/types'
import { StorageService } from './storageService'

// @ts-ignore
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

export class ThumbnailService {
  private thumbnailsDir: string
  private ffmpegPath: string
  private queue: { filePath: string; id: string; isMovie?: boolean }[] = []
  private isProcessing = false
  private storageService: StorageService
  private onThumbnailGenerated?: (id: string, isMovie?: boolean) => void

  constructor(storageService: StorageService) {
    this.storageService = storageService
    this.thumbnailsDir = path.join(app.getPath('userData'), 'thumbnails')
    if (!fs.existsSync(this.thumbnailsDir)) {
      fs.mkdirSync(this.thumbnailsDir, { recursive: true })
    }

    this.ffmpegPath = ffmpegInstaller.path || 'ffmpeg'
  }

  public setCallback(callback: (id: string, isMovie?: boolean) => void): void {
    this.onThumbnailGenerated = callback
  }

  public getThumbnailPath(id: string): string {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_')
    return path.join(this.thumbnailsDir, `${safeId}.jpg`)
  }

  public hasThumbnail(id: string): boolean {
    const thumbPath = this.getThumbnailPath(id)
    return fs.existsSync(thumbPath)
  }

  public async generateThumbnail(filePath: string, id: string, isMovie = false): Promise<boolean> {
    const outPath = this.getThumbnailPath(id)
    if (fs.existsSync(outPath)) {
      return true
    }

    if (!fs.existsSync(filePath)) {
      return false
    }

    // For movies, sample at 10 minutes (600s), for episodes sample at 3 minutes (180s)
    const initialSeek = isMovie ? '00:10:00' : '00:03:00'
    let success = await this.runFfmpeg(filePath, outPath, initialSeek)
    if (!success) {
      success = await this.runFfmpeg(filePath, outPath, '00:01:00')
    }
    if (!success) {
      success = await this.runFfmpeg(filePath, outPath, '00:00:15')
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
          'scale=540:-1',
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
        if (!this.queue.some((item) => item.id === ep.id)) {
          this.queue.push({
            filePath: ep.filePath,
            id: ep.id,
            isMovie: false
          })
        }
      } else if (!ep.hasThumbnail) {
        ep.hasThumbnail = true
      }
    }

    this.processQueue()
  }

  public queueMovie(movie: Movie): void {
    const settings = this.storageService.getSettings()
    if (!settings.enableThumbnails) return

    if (!this.hasThumbnail(movie.id)) {
      if (!this.queue.some((item) => item.id === movie.id)) {
        this.queue.push({
          filePath: movie.primaryFilePath,
          id: movie.id,
          isMovie: true
        })
      }
    } else if (!movie.hasThumbnail) {
      movie.hasThumbnail = true
    }

    this.processQueue()
  }

  public queueMovies(movies: Movie[]): void {
    for (const m of movies) {
      this.queueMovie(m)
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return
    this.isProcessing = true

    while (this.queue.length > 0) {
      const item = this.queue.shift()
      if (!item) break

      const success = await this.generateThumbnail(item.filePath, item.id, item.isMovie)
      if (success) {
        if (item.isMovie) {
          this.storageService.updateMovieProgress(item.id, { hasThumbnail: true })
        }

        if (this.onThumbnailGenerated) {
          this.onThumbnailGenerated(item.id, item.isMovie)
        }
      }

      await new Promise((r) => setTimeout(r, 60))
    }

    this.isProcessing = false
  }
}
