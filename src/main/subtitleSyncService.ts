import * as fs from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'
import { StorageService } from './storageService'
import { VlcController } from './vlcController'

// @ts-ignore
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

interface SubtitleInterval {
  start: number
  end: number
}

interface AudioInterval {
  start: number
  end: number
}

export class SubtitleSyncService {
  private ffmpegPath: string
  private storageService: StorageService
  private vlcController: VlcController

  constructor(storageService: StorageService, vlcController: VlcController) {
    this.storageService = storageService
    this.vlcController = vlcController
    this.ffmpegPath = ffmpegInstaller.path || 'ffmpeg'
  }

  // Parse time string '00:01:23,456' or '00:01:23.456' to seconds
  private parseSrtTime(timeStr: string): number {
    const parts = timeStr.trim().replace(',', '.').split(':')
    if (parts.length === 3) {
      const hours = parseFloat(parts[0])
      const minutes = parseFloat(parts[1])
      const seconds = parseFloat(parts[2])
      return hours * 3600 + minutes * 60 + seconds
    }
    return 0
  }

  // Parse ASS/SSA time string '1:23:45.67' to seconds
  private parseAssTime(timeStr: string): number {
    const parts = timeStr.trim().split(':')
    if (parts.length === 3) {
      const hours = parseFloat(parts[0])
      const minutes = parseFloat(parts[1])
      const seconds = parseFloat(parts[2])
      return hours * 3600 + minutes * 60 + seconds
    }
    return 0
  }

  // Parse raw subtitle text into time intervals
  public parseSubtitleContent(content: string, isAss: boolean = false): SubtitleInterval[] {
    const intervals: SubtitleInterval[] = []

    if (isAss) {
      const lines = content.split(/\r?\n/)
      for (const line of lines) {
        if (line.startsWith('Dialogue:')) {
          const parts = line.split(',')
          if (parts.length >= 3) {
            const start = this.parseAssTime(parts[1])
            const end = this.parseAssTime(parts[2])
            if (end > start) {
              intervals.push({ start, end })
            }
          }
        }
      }
    } else {
      // Standard SRT parsing regex
      const srtRegex = /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/g
      let match: RegExpExecArray | null
      while ((match = srtRegex.exec(content)) !== null) {
        const start = this.parseSrtTime(match[1])
        const end = this.parseSrtTime(match[2])
        if (end > start) {
          intervals.push({ start, end })
        }
      }
    }

    return intervals
  }

  // Locate external subtitle file or extract subtitle stream from video
  public async getSubtitleIntervals(filePath: string): Promise<SubtitleInterval[]> {
    const dir = path.dirname(filePath)
    const ext = path.extname(filePath)
    const base = path.basename(filePath, ext)

    // Check for common external subtitle files in same folder
    const candidateFiles = [
      path.join(dir, `${base}.srt`),
      path.join(dir, `${base}.ass`),
      path.join(dir, `${base}.en.srt`),
      path.join(dir, `${base}.eng.srt`),
      path.join(dir, `${base}.en.ass`),
      path.join(dir, `${base}.eng.ass`)
    ]

    for (const cand of candidateFiles) {
      if (fs.existsSync(cand)) {
        try {
          const content = fs.readFileSync(cand, 'utf-8')
          const isAss = cand.endsWith('.ass') || cand.endsWith('.ssa')
          const parsed = this.parseSubtitleContent(content, isAss)
          if (parsed.length > 5) {
            return parsed
          }
        } catch {
          // ignore and continue
        }
      }
    }

    // Fallback: Extract embedded subtitle stream using FFmpeg
    return new Promise((resolve) => {
      try {
        const args = ['-i', filePath, '-map', '0:s:0', '-c:s', 'srt', '-f', 'srt', '-']
        const child = spawn(this.ffmpegPath, args, { stdio: ['ignore', 'pipe', 'ignore'] })
        let stdoutData = ''

        child.stdout.on('data', (d) => {
          stdoutData += d.toString()
        })

        child.on('close', (code) => {
          if (stdoutData) {
            const parsed = this.parseSubtitleContent(stdoutData, false)
            resolve(parsed)
          } else {
            resolve([])
          }
        })

        child.on('error', () => {
          resolve([])
        })
      } catch {
        resolve([])
      }
    })
  }

  // Detect speech activity in video audio using FFmpeg's silencedetect filter
  public async detectAudioSpeechIntervals(
    filePath: string,
    sampleStartSec = 30,
    sampleDurationSec = 900
  ): Promise<AudioInterval[]> {
    return new Promise((resolve) => {
      try {
        const args = [
          '-ss',
          sampleStartSec.toString(),
          '-t',
          sampleDurationSec.toString(),
          '-i',
          filePath,
          '-vn',
          '-sn',
          '-af',
          'silencedetect=noise=-30dB:d=0.35',
          '-f',
          'null',
          '-'
        ]

        const child = spawn(this.ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] })
        let stderrData = ''

        child.stderr.on('data', (d) => {
          stderrData += d.toString()
        })

        child.on('close', () => {
          const intervals: AudioInterval[] = []
          const silences: { start: number; end: number }[] = []

          // Match silence_start: 12.345 and silence_end: 15.678
          const silenceRegex =
            /silence_start:\s*([0-9.]+)|silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/g
          let match: RegExpExecArray | null

          let currentSilenceStart = -1

          while ((match = silenceRegex.exec(stderrData)) !== null) {
            if (match[1] !== undefined) {
              currentSilenceStart = parseFloat(match[1]) + sampleStartSec
            } else if (match[2] !== undefined && currentSilenceStart >= 0) {
              const silenceEnd = parseFloat(match[2]) + sampleStartSec
              silences.push({ start: currentSilenceStart, end: silenceEnd })
              currentSilenceStart = -1
            }
          }

          // Invert silence periods to get speech intervals
          let cursor = sampleStartSec
          const totalEnd = sampleStartSec + sampleDurationSec

          for (const s of silences) {
            if (s.start > cursor) {
              intervals.push({ start: cursor, end: s.start })
            }
            cursor = s.end
          }

          if (cursor < totalEnd) {
            intervals.push({ start: cursor, end: totalEnd })
          }

          resolve(intervals)
        })

        child.on('error', () => {
          resolve([])
        })
      } catch {
        resolve([])
      }
    })
  }

  // Cross-correlation optimization to find the exact subtitle delay
  public computeOptimalOffset(
    speechIntervals: AudioInterval[],
    subIntervals: SubtitleInterval[],
    maxDuration = 900,
    binSize = 0.05,
    maxShift = 20
  ): { offsetSec: number; confidence: number } {
    const numBins = Math.ceil(maxDuration / binSize)
    const audioBins = new Uint8Array(numBins)

    for (const s of speechIntervals) {
      const b0 = Math.max(0, Math.floor(s.start / binSize))
      const b1 = Math.min(numBins - 1, Math.floor(s.end / binSize))
      for (let i = b0; i <= b1; i++) audioBins[i] = 1
    }

    const subBins = new Uint8Array(numBins)
    let totalSubBins = 0

    for (const sub of subIntervals) {
      const b0 = Math.max(0, Math.floor(sub.start / binSize))
      const b1 = Math.min(numBins - 1, Math.floor(sub.end / binSize))
      for (let i = b0; i <= b1; i++) {
        subBins[i] = 1
        totalSubBins++
      }
    }

    if (totalSubBins === 0) {
      return { offsetSec: 0, confidence: 0 }
    }

    const shiftBins = Math.floor(maxShift / binSize)
    let bestScore = -Infinity
    let bestShift = 0

    // Evaluate candidate time shifts tau in [-maxShift, +maxShift]
    for (let shift = -shiftBins; shift <= shiftBins; shift++) {
      let score = 0
      const startIdx = Math.max(0, -shift)
      const endIdx = Math.min(numBins, numBins - shift)

      for (let i = startIdx; i < endIdx; i++) {
        const a = audioBins[i + shift]
        const s = subBins[i]
        if (s === 1) {
          score += a === 1 ? 2.0 : -1.5
        }
      }

      if (score > bestScore) {
        bestScore = score
        bestShift = shift
      }
    }

    const rawOffsetSec = bestShift * binSize
    // Rounded to two decimal places (e.g. +1.45s)
    const roundedOffset = Math.round(rawOffsetSec * 100) / 100
    const confidence = Math.min(100, Math.max(10, Math.round((bestScore / (totalSubBins * 2)) * 100)))

    return { offsetSec: roundedOffset, confidence }
  }

  // Automatic one-click sync for an episode
  public async autoSyncEpisode(
    seriesId: string,
    episodeId: string
  ): Promise<{ success: boolean; offsetSec: number; message: string }> {
    const series = this.storageService.getSeries(seriesId)
    if (!series) {
      return { success: false, offsetSec: 0, message: 'Series not found' }
    }

    const episode = series.episodes.find((e) => e.id === episodeId)
    if (!episode || !fs.existsSync(episode.filePath)) {
      return { success: false, offsetSec: 0, message: 'Episode video file not found on disk' }
    }

    // 1. Get subtitle intervals
    const subIntervals = await this.getSubtitleIntervals(episode.filePath)
    if (subIntervals.length === 0) {
      return {
        success: false,
        offsetSec: 0,
        message: 'No subtitle track or external .srt found to synchronize.'
      }
    }

    // 2. Detect audio speech activity
    const speechIntervals = await this.detectAudioSpeechIntervals(episode.filePath, 30, 800)
    if (speechIntervals.length === 0) {
      return {
        success: false,
        offsetSec: 0,
        message: 'Could not extract audio speech envelope from video.'
      }
    }

    // 3. Compute optimal alignment offset
    const { offsetSec, confidence } = this.computeOptimalOffset(speechIntervals, subIntervals)

    // 4. Update episode in storage
    this.storageService.updateEpisodeProgress(seriesId, episodeId, {})
    episode.subDelaySec = offsetSec
    this.storageService.saveLibrary()

    // 5. Apply immediately to active VLC process
    await this.vlcController.setSubtitleDelay(offsetSec)

    return {
      success: true,
      offsetSec,
      message: `Aligned subtitle by ${offsetSec > 0 ? `+${offsetSec}` : offsetSec}s (${confidence}% match confidence)`
    }
  }

  // Live micro-nudge adjustment
  public async nudgeSubtitleDelay(
    seriesId: string,
    episodeId: string,
    deltaSec: number,
    applyToSeason = false
  ): Promise<{ currentDelay: number }> {
    const series = this.storageService.getSeries(seriesId)
    if (!series) return { currentDelay: 0 }

    const episode = series.episodes.find((e) => e.id === episodeId)
    if (!episode) return { currentDelay: 0 }

    const current = episode.subDelaySec || 0
    const newDelay = Math.round((current + deltaSec) * 100) / 100
    episode.subDelaySec = newDelay

    if (applyToSeason) {
      // Apply this offset to all episodes in same season
      const seasonEpisodes = series.episodes.filter((e) => e.seasonFolder === episode.seasonFolder)
      for (const ep of seasonEpisodes) {
        ep.subDelaySec = newDelay
      }
      series.defaultSubDelaySec = newDelay
    }

    this.storageService.saveLibrary()

    // Send command to live VLC process
    await this.vlcController.setSubtitleDelay(newDelay)

    return { currentDelay: newDelay }
  }

  // Reset subtitle delay back to 0.0s
  public async resetSubtitleDelay(seriesId: string, episodeId: string): Promise<void> {
    const series = this.storageService.getSeries(seriesId)
    if (!series) return

    const episode = series.episodes.find((e) => e.id === episodeId)
    if (episode) {
      episode.subDelaySec = 0
      this.storageService.saveLibrary()
    }

    await this.vlcController.setSubtitleDelay(0)
  }
}
