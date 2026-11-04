import * as fs from 'fs'
import * as path from 'path'
import { createHash, randomUUID } from 'crypto'
import { spawn } from 'child_process'
import { app } from 'electron'
import { StorageService } from './storageService'
import { PlayerManager } from './player/playerManager'
import { SyncWorker } from './syncWorker'
import { getBinaryPath } from './binaries'
import { Episode, Movie, SyncOutcome, SyncProgress, SyncReport, SyncTarget } from '../shared/types'
import { extractSpeech } from './subsync/speechEnvelope'
import {
  SubtitleFormat,
  TimingTransform,
  formatFromPath,
  parseCues,
  retimeSubtitle
} from './subsync/subtitleFormat'
import { alignNative, describeScale } from './subsync/aligner'
import { evaluateTiming, judge } from './subsync/verifier'
import { chooseSubtitleSource, isSyncedCopy, syncedCopyPath } from './subsync/subtitleSource'

export interface SyncRunOptions {
  /** Sync this subtitle file instead of choosing one (used right after a download). */
  sourcePath?: string
  /** Allow syncing the video's own subtitle track when there is no subtitle file. */
  allowEmbedded?: boolean
}

interface ResolvedTarget {
  videoPath: string
  record: Episode | Movie
}

interface PendingSync {
  target: SyncTarget
  content: string
  format: SubtitleFormat
  transform: TimingTransform
  report: SyncReport
}

interface SubtitleText {
  content: string
  format: SubtitleFormat
  sourcePath: string
}

/** Marks a source that came out of the video file rather than from a subtitle file. */
const EMBEDDED_SOURCE = '#embedded'

/**
 * Subtitle auto-sync:
 * pick the subtitle → detect speech in the audio → find the best timing → score the original and
 * the new timing independently → apply (high confidence), ask (medium) or change nothing (low).
 * The result is a retimed copy next to the video; the user's file is never modified.
 */
export class SubtitleSyncService {
  private ffmpegPath: string
  private storageService: StorageService
  private playerManager: PlayerManager
  private syncWorker: SyncWorker
  private onProgress: (p: SyncProgress) => void
  private running: AbortController | null = null
  private pending = new Map<string, PendingSync>()

  constructor(
    storageService: StorageService,
    playerManager: PlayerManager,
    syncWorker: SyncWorker,
    onProgress: (p: SyncProgress) => void = () => {}
  ) {
    this.storageService = storageService
    this.playerManager = playerManager
    this.syncWorker = syncWorker
    this.onProgress = onProgress
    this.ffmpegPath = getBinaryPath('ffmpeg')
  }

  // ---------------------------------------------------------------------------------------------
  // Auto-sync

  public async run(target: SyncTarget, opts: SyncRunOptions = {}): Promise<SyncOutcome> {
    if (this.running) {
      return { status: 'error', message: 'A subtitle sync is already running.' }
    }
    const resolved = this.resolve(target)
    if (!resolved) return { status: 'error', message: 'Video file not found on disk.' }

    const controller = new AbortController()
    this.running = controller
    try {
      return await this.runResolved(target, resolved, opts, controller.signal)
    } catch (err) {
      if (controller.signal.aborted) return { status: 'cancelled', message: 'Sync cancelled.' }
      return { status: 'error', message: (err as Error)?.message || 'Subtitle sync failed.' }
    } finally {
      this.running = null
    }
  }

  public cancel(): void {
    this.running?.abort()
  }

  private async runResolved(
    target: SyncTarget,
    { videoPath, record }: ResolvedTarget,
    opts: SyncRunOptions,
    signal: AbortSignal
  ): Promise<SyncOutcome> {
    const settings = this.storageService.getSettings()
    const lang = settings.preferredSubtitleLanguage || 'en'

    const subtitle = await this.loadSubtitle(target, videoPath, record, lang, opts)
    if (!subtitle) {
      const embeddedAvailable = await this.hasEmbeddedTextSubtitle(videoPath)
      return {
        status: 'no-subtitle',
        embeddedAvailable,
        message: embeddedAvailable
          ? 'No subtitle file found next to the video. The video has its own subtitle track, which is usually already in sync.'
          : 'No subtitle file found next to the video. Download one first.'
      }
    }

    const cues = parseCues(subtitle.content, subtitle.format)
    if (cues.length < 10) {
      return { status: 'error', message: 'The subtitle has too few lines to sync reliably.' }
    }

    this.onProgress({ stage: 'audio', fraction: 0 })
    const speech = await this.getSpeech(videoPath, signal)
    if (signal.aborted) throw new Error('cancelled')

    this.onProgress({ stage: 'aligning', fraction: 0 })
    // Let the progress message reach the window before the (synchronous) search starts.
    await new Promise((r) => setTimeout(r, 0))
    const transform = alignNative(speech, cues)
    const original = evaluateTiming(speech, cues, { offset: 0, scale: 1 })
    const aligned = evaluateTiming(speech, cues, transform)
    const verdict = judge(original, aligned, transform)
    this.onProgress({ stage: 'aligning', fraction: 1 })

    const fps = describeScale(transform.scale)
    const report: SyncReport = {
      engine: 'native',
      offsetSec: transform.offset,
      scale: transform.scale,
      fpsChange: fps ? `${fps.from} → ${fps.to} fps` : undefined,
      score: aligned.score,
      originalScore: original.score,
      confidence: verdict.confidence,
      sourcePath: subtitle.sourcePath,
      at: Date.now()
    }

    if (verdict.alreadyInSync) {
      return {
        status: 'already-in-sync',
        report: { ...report, offsetSec: 0, scale: 1, fpsChange: undefined, score: original.score },
        message: `Subtitles already look in sync (score ${original.score}/100). Nothing was changed.`
      }
    }

    if (verdict.confidence === 'low') {
      return {
        status: 'refused',
        report,
        message: `Couldn't find a reliable match (score ${aligned.score}/100), so nothing was changed. The subtitle may be for a different release; try the nudge buttons.`
      }
    }

    const pending: PendingSync = {
      target,
      content: subtitle.content,
      format: subtitle.format,
      transform,
      report
    }

    if (verdict.confidence === 'high') {
      return await this.apply(pending)
    }

    const pendingId = randomUUID()
    this.pending.clear() // only the latest result can be confirmed
    this.pending.set(pendingId, pending)
    return {
      status: 'needs-confirmation',
      pendingId,
      report,
      message: `${describeChange(report)} Confidence: medium (score ${report.score}/100). Apply it?`
    }
  }

  public async applyPending(pendingId: string): Promise<SyncOutcome> {
    const pending = this.pending.get(pendingId)
    if (!pending)
      return { status: 'error', message: 'This sync result has expired. Run auto-sync again.' }
    this.pending.delete(pendingId)
    return await this.apply(pending)
  }

  public discardPending(pendingId: string): void {
    this.pending.delete(pendingId)
  }

  /** Writes the retimed copy, remembers it, and switches the player to it if this item is playing. */
  private async apply(p: PendingSync): Promise<SyncOutcome> {
    const resolved = this.resolve(p.target)
    if (!resolved) return { status: 'error', message: 'Video file not found on disk.' }
    const { videoPath, record } = resolved
    const lang = this.storageService.getSettings().preferredSubtitleLanguage || 'en'

    const sourceForName = p.report.sourcePath.endsWith(EMBEDDED_SOURCE)
      ? `${videoPath}.srt`
      : p.report.sourcePath
    const outPath = syncedCopyPath(videoPath, sourceForName, lang)
    fs.writeFileSync(outPath, retimeSubtitle(p.content, p.format, p.transform), 'utf-8')

    record.syncedSubtitlePath = outPath
    record.syncReport = p.report
    record.subDelaySec = 0 // the timing is baked into the file now
    this.storageService.saveLibrary()

    if (this.isPlaying(p.target)) {
      await this.playerManager.addSubtitle(outPath)
      await this.playerManager.setSubtitleDelay(0)
    }

    return {
      status: 'applied',
      report: p.report,
      message: `${describeChange(p.report)} Confidence: ${p.report.confidence} (score ${p.report.score}/100).`
    }
  }

  /** Deletes the synced copy and goes back to the original subtitle. */
  public async undo(target: SyncTarget): Promise<SyncOutcome> {
    const resolved = this.resolve(target)
    if (!resolved) return { status: 'error', message: 'Video file not found on disk.' }
    const { record } = resolved
    const synced = record.syncedSubtitlePath
    const source = record.syncReport?.sourcePath

    if (synced && isSyncedCopy(synced)) {
      try {
        fs.unlinkSync(synced)
      } catch {
        // already gone
      }
    }
    record.syncedSubtitlePath = undefined
    record.syncReport = undefined
    this.storageService.saveLibrary()

    if (this.isPlaying(target) && source && fs.existsSync(source)) {
      await this.playerManager.addSubtitle(source)
    }
    return { status: 'applied', message: 'Sync undone. The original subtitle is back.' }
  }

  // ---------------------------------------------------------------------------------------------
  // Inputs

  private resolve(target: SyncTarget): ResolvedTarget | null {
    if (target.kind === 'movie') {
      const movie = this.storageService.getMovie(target.movieId)
      if (!movie || !fs.existsSync(movie.primaryFilePath)) return null
      return { videoPath: movie.primaryFilePath, record: movie }
    }
    const series = this.storageService.getSeries(target.seriesId)
    const episode = series?.episodes.find((e) => e.id === target.episodeId)
    if (!episode || !fs.existsSync(episode.filePath)) return null
    return { videoPath: episode.filePath, record: episode }
  }

  private isPlaying(target: SyncTarget): boolean {
    const now = this.syncWorker.getNowPlaying()
    if (!now || !this.playerManager.isRunning()) return false
    return target.kind === 'movie'
      ? now.movieId === target.movieId
      : now.seriesId === target.seriesId && now.episodeId === target.episodeId
  }

  private async loadSubtitle(
    target: SyncTarget,
    videoPath: string,
    record: Episode | Movie,
    lang: string,
    opts: SyncRunOptions
  ): Promise<SubtitleText | null> {
    if (opts.sourcePath) {
      const format = formatFromPath(opts.sourcePath)
      if (!format || !fs.existsSync(opts.sourcePath)) return null
      return { content: readText(opts.sourcePath), format, sourcePath: opts.sourcePath }
    }

    const playingPath = this.isPlaying(target)
      ? await this.playerManager.getSelectedExternalSubtitle()
      : null
    const previous = record.syncReport?.sourcePath
    const choice = chooseSubtitleSource({
      videoPath,
      preferredLang: lang,
      playingPath,
      previousSource: previous && !previous.endsWith(EMBEDDED_SOURCE) ? previous : null
    })

    if (choice) {
      const format = formatFromPath(choice.path)
      if (format) {
        return { content: readText(choice.path), format, sourcePath: choice.path }
      }
    }

    if (!opts.allowEmbedded) return null
    const extracted = await this.extractEmbedded(videoPath)
    return extracted
      ? { content: extracted, format: 'srt', sourcePath: videoPath + EMBEDDED_SOURCE }
      : null
  }

  private async getSpeech(videoPath: string, signal: AbortSignal): Promise<Uint8Array> {
    const cacheFile = this.speechCachePath(videoPath)
    if (cacheFile && fs.existsSync(cacheFile)) {
      return new Uint8Array(fs.readFileSync(cacheFile))
    }
    const speech = await extractSpeech(this.ffmpegPath, videoPath, {
      signal,
      onProgress: (fraction) => this.onProgress({ stage: 'audio', fraction })
    })
    if (cacheFile) {
      try {
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true })
        fs.writeFileSync(cacheFile, speech)
      } catch {
        // cache is optional
      }
    }
    return speech
  }

  /** One small file per video version, so re-syncing (for example a new subtitle) is instant. */
  private speechCachePath(videoPath: string): string | null {
    try {
      const st = fs.statSync(videoPath)
      const key = createHash('sha1')
        .update(`speech-v1|${videoPath}|${st.size}|${st.mtimeMs}`)
        .digest('hex')
      return path.join(app.getPath('userData'), 'cache', 'speech', `${key}.bin`)
    } catch {
      return null
    }
  }

  private runFfmpeg(args: string[], collect: 'stdout' | 'stderr'): Promise<string> {
    return new Promise((resolve) => {
      try {
        const child = spawn(this.ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
        let out = ''
        child[collect].on('data', (d: Buffer) => {
          out += d.toString()
        })
        child.on('close', () => resolve(out))
        child.on('error', () => resolve(''))
      } catch {
        resolve('')
      }
    })
  }

  private async hasEmbeddedTextSubtitle(videoPath: string): Promise<boolean> {
    const info = await this.runFfmpeg(['-hide_banner', '-i', videoPath], 'stderr')
    return /Subtitle:\s*(subrip|ass|ssa|webvtt|mov_text|text)/i.test(info)
  }

  /** First embedded text subtitle as SRT (only when the user asks for it). */
  private async extractEmbedded(videoPath: string): Promise<string | null> {
    const out = await this.runFfmpeg(
      ['-hide_banner', '-i', videoPath, '-map', '0:s:0', '-c:s', 'srt', '-f', 'srt', '-'],
      'stdout'
    )
    return out.trim() ? out : null
  }

  // ---------------------------------------------------------------------------------------------
  // Manual delay (nudge buttons)

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
      const seasonEpisodes = series.episodes.filter((e) => e.seasonFolder === episode.seasonFolder)
      for (const ep of seasonEpisodes) {
        ep.subDelaySec = newDelay
      }
      series.defaultSubDelaySec = newDelay
    }

    this.storageService.saveLibrary()
    await this.playerManager.setSubtitleDelay(newDelay)

    return { currentDelay: newDelay }
  }

  public async nudgeMovieSubtitleDelay(
    movieId: string,
    deltaSec: number
  ): Promise<{ currentDelay: number }> {
    const movie = this.storageService.getMovie(movieId)
    if (!movie) return { currentDelay: 0 }

    const current = movie.subDelaySec || 0
    const newDelay = Math.round((current + deltaSec) * 100) / 100
    movie.subDelaySec = newDelay

    this.storageService.saveLibrary()
    await this.playerManager.setSubtitleDelay(newDelay)

    return { currentDelay: newDelay }
  }

  public async resetSubtitleDelay(seriesId: string, episodeId: string): Promise<void> {
    const series = this.storageService.getSeries(seriesId)
    if (!series) return

    const episode = series.episodes.find((e) => e.id === episodeId)
    if (episode) {
      episode.subDelaySec = 0
      this.storageService.saveLibrary()
    }

    await this.playerManager.setSubtitleDelay(0)
  }

  public async resetMovieSubtitleDelay(movieId: string): Promise<void> {
    const movie = this.storageService.getMovie(movieId)
    if (movie) {
      movie.subDelaySec = 0
      this.storageService.saveLibrary()
    }

    await this.playerManager.setSubtitleDelay(0)
  }
}

/** Reads a subtitle as UTF-8, falling back to Latin-1 for old files, and drops a BOM. */
function readText(filePath: string): string {
  const buf = fs.readFileSync(filePath)
  let text = buf.toString('utf-8')
  if (text.includes('\uFFFD')) text = buf.toString('latin1')
  return text.replace(/^\uFEFF/, '')
}

/** "Shifted −1.42 s and corrected 25 → 23.976 fps." */
export function describeChange(report: Pick<SyncReport, 'offsetSec' | 'fpsChange'>): string {
  const parts: string[] = []
  if (Math.abs(report.offsetSec) >= 0.005) {
    const sign = report.offsetSec > 0 ? '+' : '−'
    parts.push(`shifted ${sign}${Math.abs(report.offsetSec).toFixed(2)} s`)
  }
  if (report.fpsChange) parts.push(`corrected ${report.fpsChange}`)
  const text = parts.length ? parts.join(' and ') : 'kept the timing'
  return text.charAt(0).toUpperCase() + text.slice(1) + '.'
}
