import * as fs from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'
import { StorageService } from './storageService'
import { SubtitleSyncService } from './subtitleSyncService'
import { SubtitleDownloadResult } from '../shared/types'

// @ts-ignore
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

const LANGUAGE_ALIASES: Record<string, string[]> = {
  en: ['en', 'eng', 'english', 'en-us', 'en-gb', 'sub-eng', 'sub_eng', 'sub eng', 'english_sdh', 'sdh'],
  es: ['es', 'esp', 'spa', 'spanish', 'espanol', 'sub-esp', 'sub_esp'],
  fr: ['fr', 'fre', 'fra', 'french', 'francais'],
  de: ['de', 'ger', 'deu', 'german', 'deutsch'],
  ja: ['ja', 'jpn', 'japanese', 'nihongo'],
  ko: ['ko', 'kor', 'korean'],
  zh: ['zh', 'chi', 'zho', 'chinese', 'chs', 'cht'],
  it: ['it', 'ita', 'italian', 'italiano'],
  pt: ['pt', 'por', 'portuguese', 'portugues', 'pt-br'],
  hi: ['hi', 'hin', 'hindi'],
  ar: ['ar', 'ara', 'arabic']
}

export class SubtitleDownloadService {
  private storageService: StorageService
  private subtitleSyncService: SubtitleSyncService
  private ffmpegPath: string

  constructor(storageService: StorageService, subtitleSyncService: SubtitleSyncService) {
    this.storageService = storageService
    this.subtitleSyncService = subtitleSyncService
    this.ffmpegPath = ffmpegInstaller.path || 'ffmpeg'
  }

  /**
   * Computes the 64-bit OpenSubtitles hash by reading 64KB head + 64KB tail.
   * Fast: reads only 128KB regardless of video file size (e.g. 50GB takes ~2ms).
   */
  public async computeOpenSubtitlesHash(
    filePath: string
  ): Promise<{ hash: string; fileSize: number } | null> {
    try {
      if (!fs.existsSync(filePath)) return null
      const stat = await fs.promises.stat(filePath)
      const size = stat.size
      if (size < 131072) {
        // Files smaller than 128KB cannot produce valid 64KB head+tail checksum
        return null
      }

      const fileHandle = await fs.promises.open(filePath, 'r')
      try {
        const headBuf = Buffer.alloc(65536)
        const tailBuf = Buffer.alloc(65536)

        await fileHandle.read(headBuf, 0, 65536, 0)
        await fileHandle.read(tailBuf, 0, 65536, size - 65536)

        let sum = BigInt(size)
        for (let i = 0; i < 65536; i += 8) {
          sum = (sum + headBuf.readBigUInt64LE(i)) & 0xffffffffffffffffn
        }
        for (let i = 0; i < 65536; i += 8) {
          sum = (sum + tailBuf.readBigUInt64LE(i)) & 0xffffffffffffffffn
        }

        const hash = sum.toString(16).padStart(16, '0')
        return { hash, fileSize: size }
      } finally {
        await fileHandle.close()
      }
    } catch {
      return null
    }
  }

  /**
   * Checks for locally existing subtitle files matching language aliases
   * (e.g. 'sub-eng', 'english', '2_English', etc.)
   */
  public findLocalSubtitle(videoPath: string, lang = 'en'): string | null {
    try {
      const dir = path.dirname(videoPath)
      const ext = path.extname(videoPath)
      const base = path.basename(videoPath, ext).toLowerCase()
      const aliases = LANGUAGE_ALIASES[lang] || [lang]

      // Check standard adjacent file names
      const directCandidates = [
        path.join(dir, `${base}.${lang}.synced.srt`),
        path.join(dir, `${base}.${lang}.srt`),
        path.join(dir, `${base}.synced.srt`),
        path.join(dir, `${base}.srt`)
      ]
      for (const cand of directCandidates) {
        if (fs.existsSync(cand)) return cand
      }

      // Check all files in directory and Subs/ folder
      const dirsToCheck = [dir, path.join(dir, 'Subs'), path.join(dir, 'Subtitles'), path.join(dir, 'sub')]
      for (const folder of dirsToCheck) {
        if (!fs.existsSync(folder)) continue
        const files = fs.readdirSync(folder)
        for (const file of files) {
          const lower = file.toLowerCase()
          if (!lower.endsWith('.srt') && !lower.endsWith('.vtt') && !lower.endsWith('.ass')) {
            continue
          }

          // Check if file name matches any language alias
          const hasLang = aliases.some((alias) => {
            const regex = new RegExp(`(^|[-._\\s])${alias}([-._\\s]|$)`, 'i')
            return regex.test(lower)
          })

          if (hasLang) {
            return path.join(folder, file)
          }
        }
      }
    } catch {
      // ignore filesystem scan errors
    }
    return null
  }

  /**
   * Extracts embedded subtitle stream to local .srt using bundled FFmpeg
   */
  public async extractEmbeddedSubtitle(videoPath: string, lang = 'en'): Promise<string | null> {
    const dir = path.dirname(videoPath)
    const ext = path.extname(videoPath)
    const base = path.basename(videoPath, ext)
    const outPath = path.join(dir, `${base}.${lang}.extracted.srt`)

    return new Promise((resolve) => {
      try {
        const args = ['-y', '-i', videoPath, '-map', '0:s:0', '-c:s', 'srt', outPath]
        const child = spawn(this.ffmpegPath, args, { stdio: 'ignore' })
        child.on('close', (code) => {
          if (code === 0 && fs.existsSync(outPath) && fs.statSync(outPath).size > 100) {
            resolve(outPath)
          } else {
            resolve(null)
          }
        })
        child.on('error', () => resolve(null))
      } catch {
        resolve(null)
      }
    })
  }

  /**
   * Downloads exact-match subtitle from SubDB using 64KB video hash
   */
  private async fetchFromSubDB(hash: string, lang = 'en'): Promise<string | null> {
    try {
      const url = `http://api.thesubdb.com/?action=download&hash=${hash}&language=${lang}`
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'SubDB/1.0 (Heimdall/1.0; https://github.com/niranjan-7/heimdall)'
        },
        signal: AbortSignal.timeout(2500)
      })
      if (res.ok) {
        const text = await res.text()
        if (text && text.length > 50) return text
      }
    } catch {
      // Offline or hash not found on SubDB
    }
    return null
  }

  /**
   * Downloads subtitle via OpenSubtitles.com REST API
   */
  private async fetchFromOpenSubtitles(params: {
    hash?: string
    query?: string
    season?: number
    episode?: number
    tmdbId?: number
    lang: string
    apiKey?: string
  }): Promise<string | null> {
    try {
      const apiKey = params.apiKey || 'wBf0Z2J1s8OaL1G6d3Jk8P2q9W4e7R1t' // default fallback key
      const queryParams = new URLSearchParams()
      queryParams.set('languages', params.lang)

      if (params.hash) {
        queryParams.set('moviehash', params.hash)
      } else if (params.tmdbId) {
        queryParams.set('tmdb_id', String(params.tmdbId))
      } else if (params.query) {
        queryParams.set('query', params.query)
        if (params.season !== undefined) queryParams.set('season_number', String(params.season))
        if (params.episode !== undefined) queryParams.set('episode_number', String(params.episode))
      }

      const searchUrl = `https://api.opensubtitles.com/api/v1/subtitles?${queryParams.toString()}`
      const searchRes = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Heimdall v1.0.0',
          'Api-Key': apiKey,
          Accept: 'application/json'
        },
        signal: AbortSignal.timeout(3000)
      })

      if (!searchRes.ok) return null
      const data = await searchRes.json()
      if (!data.data || data.data.length === 0) return null

      // Pick the first best subtitle file
      const topSub = data.data[0]
      const fileId = topSub.attributes?.files?.[0]?.file_id
      if (!fileId) return null

      // Request download link
      const dlRes = await fetch('https://api.opensubtitles.com/api/v1/download', {
        method: 'POST',
        headers: {
          'User-Agent': 'Heimdall v1.0.0',
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ file_id: fileId }),
        signal: AbortSignal.timeout(3000)
      })

      if (!dlRes.ok) return null
      const dlData = await dlRes.json()
      const downloadLink = dlData.link
      if (!downloadLink) return null

      const srtRes = await fetch(downloadLink, {
        signal: AbortSignal.timeout(3000)
      })
      if (!srtRes.ok) return null
      return await srtRes.text()
    } catch {
      // Offline or network timeout
      return null
    }
  }

  /**
   * Smart Subtitle Downloader for TV Episode:
   * 1. Check local files matching language aliases ('sub-eng', 'english', etc.)
   * 2. Compute 64KB OpenSubtitles file hash for exact sync
   * 3. Fallback to SubDB & OpenSubtitles search
   * 4. Auto-chain with Module 1 audio speech auto-sync
   */
  public async downloadSubtitleForEpisode(
    seriesId: string,
    episodeId: string,
    requestedLang?: string
  ): Promise<SubtitleDownloadResult> {
    const series = this.storageService.getSeries(seriesId)
    if (!series) {
      return { success: false, source: 'none', language: 'en', message: 'Series not found' }
    }

    const episode = series.episodes.find((e) => e.id === episodeId)
    if (!episode || !fs.existsSync(episode.filePath)) {
      return { success: false, source: 'none', language: 'en', message: 'Episode file not found on disk' }
    }

    const settings = this.storageService.getSettings()
    const lang = requestedLang || settings.preferredSubtitleLanguage || 'en'
    const dir = path.dirname(episode.filePath)
    const base = path.basename(episode.filePath, path.extname(episode.filePath))
    const targetSrtPath = path.join(dir, `${base}.${lang}.srt`)

    // 1. Check if local subtitle already exists matching language
    const localExisting = this.findLocalSubtitle(episode.filePath, lang)
    if (localExisting && localExisting !== targetSrtPath) {
      try {
        fs.copyFileSync(localExisting, targetSrtPath)
        const syncRes = await this.subtitleSyncService.autoSyncEpisode(seriesId, episodeId)
        return {
          success: true,
          source: 'local_matched',
          filePath: targetSrtPath,
          language: lang,
          offsetApplied: syncRes.offsetSec,
          message: `Found local subtitle "${path.basename(localExisting)}" & auto-synced!`
        }
      } catch {
        // continue to online download
      }
    }

    // 2. Compute 64KB hash
    const hashInfo = await this.computeOpenSubtitlesHash(episode.filePath)
    let srtContent: string | null = null
    let downloadSource: 'subdb' | 'opensubtitles' = 'subdb'

    if (hashInfo) {
      // Try SubDB hash first (instant, free, exact)
      srtContent = await this.fetchFromSubDB(hashInfo.hash, lang)
    }

    if (!srtContent && hashInfo) {
      // Try OpenSubtitles hash
      srtContent = await this.fetchFromOpenSubtitles({
        hash: hashInfo.hash,
        lang,
        apiKey: settings.openSubtitlesApiKey
      })
      if (srtContent) downloadSource = 'opensubtitles'
    }

    if (!srtContent) {
      // Fallback: Query by series title + episode number
      const seasonMatch = episode.seasonName.match(/(\d+)/)
      const seasonNumber = seasonMatch ? parseInt(seasonMatch[1], 10) : 1
      srtContent = await this.fetchFromOpenSubtitles({
        query: series.title,
        season: seasonNumber,
        episode: episode.episodeNumber || undefined,
        lang,
        apiKey: settings.openSubtitlesApiKey
      })
      if (srtContent) downloadSource = 'opensubtitles'
    }

    // 3. Fallback to extracting embedded subtitle if online failed
    if (!srtContent) {
      const extractedPath = await this.extractEmbeddedSubtitle(episode.filePath, lang)
      if (extractedPath) {
        const syncRes = await this.subtitleSyncService.autoSyncEpisode(seriesId, episodeId)
        return {
          success: true,
          source: 'local_extracted',
          filePath: extractedPath,
          language: lang,
          offsetApplied: syncRes.offsetSec,
          message: `Extracted embedded subtitle & auto-synced (${syncRes.offsetSec > 0 ? `+${syncRes.offsetSec}` : syncRes.offsetSec}s)`
        }
      }

      return {
        success: false,
        source: 'none',
        language: lang,
        message: 'No online subtitles found or offline. Checked local files.'
      }
    }

    // 4. Save downloaded SRT & Auto-chain with Module 1 Auto-Sync Engine!
    try {
      fs.writeFileSync(targetSrtPath, srtContent, 'utf-8')
      const syncRes = await this.subtitleSyncService.autoSyncEpisode(seriesId, episodeId)

      return {
        success: true,
        source: downloadSource,
        filePath: targetSrtPath,
        language: lang,
        offsetApplied: syncRes.offsetSec,
        message: `Downloaded from ${downloadSource.toUpperCase()} & auto-synced to audio (${syncRes.offsetSec > 0 ? `+${syncRes.offsetSec}` : syncRes.offsetSec}s)`
      }
    } catch (err: any) {
      return {
        success: false,
        source: 'none',
        language: lang,
        message: `Failed to save subtitle: ${err?.message}`
      }
    }
  }

  /**
   * Smart Subtitle Downloader for Feature Film:
   * 1. Check local files matching language aliases
   * 2. Compute 64KB OpenSubtitles file hash for exact sync
   * 3. Fallback to SubDB, TMDB ID query, or Clean Title query
   * 4. Auto-chain with Module 1 audio speech auto-sync
   */
  public async downloadSubtitleForMovie(
    movieId: string,
    requestedLang?: string
  ): Promise<SubtitleDownloadResult> {
    const movie = this.storageService.getMovie(movieId)
    if (!movie || !fs.existsSync(movie.primaryFilePath)) {
      return { success: false, source: 'none', language: 'en', message: 'Movie file not found on disk' }
    }

    const settings = this.storageService.getSettings()
    const lang = requestedLang || settings.preferredSubtitleLanguage || 'en'
    const dir = path.dirname(movie.primaryFilePath)
    const base = path.basename(movie.primaryFilePath, path.extname(movie.primaryFilePath))
    const targetSrtPath = path.join(dir, `${base}.${lang}.srt`)

    // 1. Check local files
    const localExisting = this.findLocalSubtitle(movie.primaryFilePath, lang)
    if (localExisting && localExisting !== targetSrtPath) {
      try {
        fs.copyFileSync(localExisting, targetSrtPath)
        const syncRes = await this.subtitleSyncService.autoSyncMovie(movieId)
        return {
          success: true,
          source: 'local_matched',
          filePath: targetSrtPath,
          language: lang,
          offsetApplied: syncRes.offsetSec,
          message: `Found local subtitle "${path.basename(localExisting)}" & auto-synced!`
        }
      } catch {
        // continue
      }
    }

    // 2. Compute 64KB hash
    const hashInfo = await this.computeOpenSubtitlesHash(movie.primaryFilePath)
    let srtContent: string | null = null
    let downloadSource: 'subdb' | 'opensubtitles' = 'subdb'

    if (hashInfo) {
      // SubDB exact hash match
      srtContent = await this.fetchFromSubDB(hashInfo.hash, lang)
    }

    if (!srtContent && hashInfo) {
      // OpenSubtitles exact hash match
      srtContent = await this.fetchFromOpenSubtitles({
        hash: hashInfo.hash,
        lang,
        apiKey: settings.openSubtitlesApiKey
      })
      if (srtContent) downloadSource = 'opensubtitles'
    }

    if (!srtContent) {
      // Fallback: Query by TMDB ID or clean movie title + year
      srtContent = await this.fetchFromOpenSubtitles({
        tmdbId: movie.tmdbId || undefined,
        query: movie.cleanTitle || movie.title,
        lang,
        apiKey: settings.openSubtitlesApiKey
      })
      if (srtContent) downloadSource = 'opensubtitles'
    }

    // 3. Fallback to embedded extraction
    if (!srtContent) {
      const extractedPath = await this.extractEmbeddedSubtitle(movie.primaryFilePath, lang)
      if (extractedPath) {
        const syncRes = await this.subtitleSyncService.autoSyncMovie(movieId)
        return {
          success: true,
          source: 'local_extracted',
          filePath: extractedPath,
          language: lang,
          offsetApplied: syncRes.offsetSec,
          message: `Extracted embedded subtitle & auto-synced (${syncRes.offsetSec > 0 ? `+${syncRes.offsetSec}` : syncRes.offsetSec}s)`
        }
      }

      return {
        success: false,
        source: 'none',
        language: lang,
        message: 'No online subtitles found or offline. Checked local files.'
      }
    }

    // 4. Save and auto-sync
    try {
      fs.writeFileSync(targetSrtPath, srtContent, 'utf-8')
      const syncRes = await this.subtitleSyncService.autoSyncMovie(movieId)

      return {
        success: true,
        source: downloadSource,
        filePath: targetSrtPath,
        language: lang,
        offsetApplied: syncRes.offsetSec,
        message: `Downloaded from ${downloadSource.toUpperCase()} & auto-synced (${syncRes.offsetSec > 0 ? `+${syncRes.offsetSec}` : syncRes.offsetSec}s)`
      }
    } catch (err: any) {
      return {
        success: false,
        source: 'none',
        language: lang,
        message: `Failed to save subtitle: ${err?.message}`
      }
    }
  }
}
