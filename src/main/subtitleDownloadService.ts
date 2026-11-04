import * as fs from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'
import { StorageService } from './storageService'
import { SubtitleSyncService } from './subtitleSyncService'
import { findLocalSubtitleFor } from './subsync/subtitleSource'
import { SubtitleDownloadResult } from '../shared/types'
import { getBinaryPath } from './binaries'



export class SubtitleDownloadService {
  private storageService: StorageService
  private subtitleSyncService: SubtitleSyncService
  private ffmpegPath: string

  constructor(storageService: StorageService, subtitleSyncService: SubtitleSyncService) {
    this.storageService = storageService
    this.subtitleSyncService = subtitleSyncService
    this.ffmpegPath = getBinaryPath('ffmpeg')
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
  /** A subtitle file for this video in `lang` (or with no language in its name). */
  public findLocalSubtitle(videoPath: string, lang = 'en'): string | null {
    return findLocalSubtitleFor(videoPath, lang)
  }

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
   * 3. Ask OpenSubtitles by file hash, then by title and episode
   * 4. Auto-sync the result to the audio
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
        const sync = await this.subtitleSyncService.run({ kind: 'episode', seriesId, episodeId }, { sourcePath: localExisting })
        return {
          success: true,
          source: 'local_matched',
          filePath: localExisting,
          language: lang,
          sync,
          message: `Found local subtitle "${path.basename(localExisting)}". ${sync.message}`
        }
      } catch {
        // continue to online download
      }
    }

    // 2. Compute 64KB hash
    const hashInfo = await this.computeOpenSubtitlesHash(episode.filePath)
    let srtContent: string | null = null
    if (hashInfo) {
      // Try OpenSubtitles hash
      srtContent = await this.fetchFromOpenSubtitles({
        hash: hashInfo.hash,
        lang,
        apiKey: settings.openSubtitlesApiKey
      })
    }

    if (!srtContent) {
      // Fallback: Query by series title + episode number
      const seasonMatch = episode.seasonName.match(/(\d+)/)
      const seasonNumber = seasonMatch ? parseInt(seasonMatch[1], 10) : 1
      srtContent = await this.fetchFromOpenSubtitles({
        query: series.aniListTitle || series.title,
        season: seasonNumber,
        episode: episode.episodeNumber || undefined,
        lang,
        apiKey: settings.openSubtitlesApiKey
      })
    }

    // 3. Fallback to extracting embedded subtitle if online failed
    if (!srtContent) {
      const extractedPath = await this.extractEmbeddedSubtitle(episode.filePath, lang)
      if (extractedPath) {
        return {
          success: true,
          source: 'local_extracted',
          filePath: extractedPath,
          language: lang,
          message: 'Extracted the subtitle built into the video. Built-in subtitles are normally already in sync, so it was not auto-synced.'
        }
      }

      return {
        success: false,
        source: 'none',
        language: lang,
        message: 'No online subtitles found or offline. Checked local files.'
      }
    }

    // 4. Save the downloaded SRT and auto-sync it
    try {
      fs.writeFileSync(targetSrtPath, srtContent, 'utf-8')
      const sync = await this.subtitleSyncService.run({ kind: 'episode', seriesId, episodeId }, { sourcePath: targetSrtPath })

      return {
        success: true,
        source: 'opensubtitles',
        filePath: targetSrtPath,
        language: lang,
        sync,
        message: `Downloaded from OpenSubtitles. ${sync.message}`
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
   * 3. Ask OpenSubtitles by file hash, then by TMDB ID or title
   * 4. Auto-sync the result to the audio
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
        const sync = await this.subtitleSyncService.run({ kind: 'movie', movieId }, { sourcePath: localExisting })
        return {
          success: true,
          source: 'local_matched',
          filePath: localExisting,
          language: lang,
          sync,
          message: `Found local subtitle "${path.basename(localExisting)}". ${sync.message}`
        }
      } catch {
        // continue
      }
    }

    // 2. Compute 64KB hash
    const hashInfo = await this.computeOpenSubtitlesHash(movie.primaryFilePath)
    let srtContent: string | null = null
    if (hashInfo) {
      // OpenSubtitles exact hash match
      srtContent = await this.fetchFromOpenSubtitles({
        hash: hashInfo.hash,
        lang,
        apiKey: settings.openSubtitlesApiKey
      })
    }

    if (!srtContent) {
      // Fallback: Query by TMDB ID or clean movie title + year
      srtContent = await this.fetchFromOpenSubtitles({
        tmdbId: movie.tmdbId || undefined,
        query: movie.cleanTitle || movie.title,
        lang,
        apiKey: settings.openSubtitlesApiKey
      })
    }

    // 3. Fallback to embedded extraction
    if (!srtContent) {
      const extractedPath = await this.extractEmbeddedSubtitle(movie.primaryFilePath, lang)
      if (extractedPath) {
        return {
          success: true,
          source: 'local_extracted',
          filePath: extractedPath,
          language: lang,
          message: 'Extracted the subtitle built into the video. Built-in subtitles are normally already in sync, so it was not auto-synced.'
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
      const sync = await this.subtitleSyncService.run({ kind: 'movie', movieId }, { sourcePath: targetSrtPath })

      return {
        success: true,
        source: 'opensubtitles',
        filePath: targetSrtPath,
        language: lang,
        sync,
        message: `Downloaded from OpenSubtitles. ${sync.message}`
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
