import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { Series, SeriesFillerStats, FillerShowOption, FillerShowPreview } from '../shared/types'
import { FillerShowEntry, ParsedEpisodeFiller, parseShowList, parseShowPage } from './fillerParser'
import {
  applyFillerToEpisodes,
  bestShowMatch,
  computeEpisodeOffset,
  createThrottle,
  fillerCacheTtlMs,
  prequelEpisodeTotal,
  rankShows,
  searchShows,
  slugCandidatesFromTitles
} from './fillerMatcher'
import type { AniListService, AniListFillerMatchInfo } from './anilistService'

const SITE = 'https://www.animefillerlist.com'
/** The master show list changes rarely; refresh it monthly. */
const SHOW_LIST_TTL_MS = 30 * 24 * 60 * 60 * 1000

interface CachedShow {
  slug: string
  sourceUrl: string
  lastSyncedAt: number
  counts: Omit<SeriesFillerStats, 'sourceUrl' | 'lastSyncedAt'>
  episodes: Array<{ epNum: number } & ParsedEpisodeFiller>
}

interface CachedShowList {
  fetchedAt: number
  shows: FillerShowEntry[]
}

export interface EnrichOptions {
  /** Ignore the cache TTL and fetch the page again ("Refresh filler data"). */
  force?: boolean
}

export interface EnrichResult {
  series: Series
  /** The page was matched but could not be fetched and no cache exists (offline, site down). */
  unavailable: boolean
}

/** Every request to animefillerlist goes through this: at most one request per second. */
const throttle = createThrottle(1000)

export class FillerService {
  private cacheDir: string
  private showListCachePath: string
  private showList: CachedShowList | null = null
  private userAgent: string

  constructor(private anilist: Pick<AniListService, 'getFillerMatchInfo' | 'getPrequelChain'>) {
    const userData = app.getPath('userData')
    this.cacheDir = path.join(userData, 'cache', 'filler')
    this.showListCachePath = path.join(this.cacheDir, 'shows_master_list.json')
    this.userAgent = `Heimdall/${app.getVersion()} (personal media library app; +https://github.com/niranjan-7/heimdall)`
    try {
      fs.mkdirSync(this.cacheDir, { recursive: true })
    } catch (err) {
      console.error('[FillerService] Failed to create cache dir:', err)
    }
  }

  // ── Network ───────────────────────────────────────────────────────────────

  private async fetchHtml(url: string): Promise<string | null> {
    return throttle(async () => {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': this.userAgent, Accept: 'text/html' },
          signal: AbortSignal.timeout(8000)
        })
        if (!res.ok) return null
        return await res.text()
      } catch (err) {
        console.warn(
          `[FillerService] Request failed for ${url}: ${err instanceof Error ? err.message : err}`
        )
        return null
      }
    })
  }

  // ── Master show list ──────────────────────────────────────────────────────

  /** Master list from memory → disk → network. Returns a stale copy rather than nothing. */
  public async getShowList(force = false): Promise<FillerShowEntry[]> {
    if (!this.showList) this.showList = this.readShowListCache()
    const fresh = this.showList && Date.now() - this.showList.fetchedAt < SHOW_LIST_TTL_MS
    if (this.showList && fresh && !force) return this.showList.shows

    const html = await this.fetchHtml(`${SITE}/shows`)
    const shows = html ? parseShowList(html) : []
    if (shows.length > 0) {
      this.showList = { fetchedAt: Date.now(), shows }
      try {
        fs.writeFileSync(this.showListCachePath, JSON.stringify(this.showList), 'utf8')
      } catch (err) {
        console.warn('[FillerService] Failed to write show list cache:', err)
      }
    } else if (html) {
      console.warn('[FillerService] Show list parsed to 0 entries; keeping the previous copy')
    }
    return this.showList?.shows ?? []
  }

  private readShowListCache(): CachedShowList | null {
    try {
      if (!fs.existsSync(this.showListCachePath)) return null
      const raw = JSON.parse(fs.readFileSync(this.showListCachePath, 'utf8'))
      // Older versions stored a bare array.
      if (Array.isArray(raw)) return { fetchedAt: 0, shows: raw }
      if (raw && Array.isArray(raw.shows))
        return { fetchedAt: raw.fetchedAt || 0, shows: raw.shows }
    } catch (err) {
      console.warn('[FillerService] Could not read show list cache:', err)
    }
    return null
  }

  // ── Show pages ────────────────────────────────────────────────────────────

  private showCachePath(slug: string): string {
    return path.join(this.cacheDir, `show_${slug.replace(/[^a-zA-Z0-9-]/g, '_')}.json`)
  }

  private readShowCache(slug: string): CachedShow | null {
    try {
      const file = this.showCachePath(slug)
      if (!fs.existsSync(file)) return null
      const data = JSON.parse(fs.readFileSync(file, 'utf8')) as CachedShow
      return Array.isArray(data?.episodes) && data.episodes.length > 0 ? data : null
    } catch (err) {
      console.warn('[FillerService] Error reading filler cache:', err)
      return null
    }
  }

  /**
   * Show page from cache when fresh, otherwise from the site. When the fetch
   * fails or parses to 0 episodes, the previous cache is kept and returned.
   */
  public async getShow(slug: string, ttlMs: number, force = false): Promise<CachedShow | null> {
    const cached = this.readShowCache(slug)
    if (cached && !force && Date.now() - cached.lastSyncedAt < ttlMs) return cached

    const sourceUrl = `${SITE}/shows/${slug}`
    const html = await this.fetchHtml(sourceUrl)
    if (html === null) return cached

    const parsed = parseShowPage(html)
    if (parsed.episodes.size === 0) {
      if (cached) {
        console.warn(
          `[FillerService] ${slug}: page parsed to 0 episodes; keeping cached data from ${new Date(cached.lastSyncedAt).toISOString()}`
        )
      }
      return cached
    }

    const fresh: CachedShow = {
      slug,
      sourceUrl,
      lastSyncedAt: Date.now(),
      counts: parsed.counts,
      episodes: Array.from(parsed.episodes.entries()).map(([epNum, info]) => ({ epNum, ...info }))
    }
    try {
      fs.writeFileSync(this.showCachePath(slug), JSON.stringify(fresh), 'utf8')
    } catch (err) {
      console.warn('[FillerService] Failed to write cache file:', err)
    }
    return fresh
  }

  public async previewShow(slug: string): Promise<FillerShowPreview | null> {
    const show = await this.getShow(slug, fillerCacheTtlMs(null))
    if (!show) return null
    return {
      slug,
      totalEpisodes: show.episodes.length,
      lastSyncedAt: show.lastSyncedAt,
      ...show.counts
    }
  }

  // ── Matching ──────────────────────────────────────────────────────────────

  private async titlesFor(
    series: Series
  ): Promise<{ titles: string[]; info: AniListFillerMatchInfo | null }> {
    const info = series.aniListId ? await this.anilist.getFillerMatchInfo(series.aniListId) : null
    const titles = info?.titles.length
      ? info.titles
      : [series.aniListTitle, series.title].filter((t): t is string => Boolean(t))
    return { titles, info }
  }

  /** Suggestions and search results for the "Fix filler match" modal. */
  public async searchForSeries(series: Series, query: string): Promise<FillerShowOption[]> {
    const shows = await this.getShowList()
    if (query.trim()) return searchShows(query, shows, 50)
    const titles = [series.aniListTitle, series.title].filter((t): t is string => Boolean(t))
    return rankShows(titles, shows, 15)
  }

  /** Returns false when nothing could be looked up (no show list and no direct hit). */
  private async autoMatch(series: Series): Promise<boolean> {
    const { titles, info } = await this.titlesFor(series)
    if (info?.status) series.aniListStatus = info.status
    const shows = await this.getShowList()

    let slug: string | null = null
    if (shows.length > 0) {
      slug = bestShowMatch(titles, shows)?.slug ?? null
    } else {
      // No master list (offline or the list page changed): try the most likely slugs directly.
      for (const candidate of slugCandidatesFromTitles(titles).slice(0, 3)) {
        if (await this.getShow(candidate, fillerCacheTtlMs(series.aniListStatus))) {
          slug = candidate
          break
        }
      }
    }
    if (!slug) {
      console.log(
        `[FillerService] No filler page matched "${series.title}" (tried: ${titles.join(' | ')})`
      )
      return shows.length > 0
    }

    let offset = 0
    if (info && shows.length > 0) {
      const chain = await this.anilist.getPrequelChain(info)
      const prequels = chain.map((p) => ({
        slug: bestShowMatch(p.titles, shows)?.slug ?? null,
        episodes: p.episodes
      }))
      offset = computeEpisodeOffset(
        series.episodes.map((e) => e.episodeNumber),
        prequelEpisodeTotal(slug, prequels)
      )
    }

    series.fillerSlug = slug
    series.fillerMatchSource = 'auto'
    series.fillerEpisodeOffset = offset
    console.log(`[FillerService] Matched "${series.title}" → ${slug} (offset ${offset})`)
    return true
  }

  /** Clears an automatic match so it is recomputed (e.g. after the AniList link changes). */
  public resetAutoMatch(series: Series): void {
    if (series.fillerMatchSource === 'manual') return
    delete series.fillerSlug
    delete series.fillerMatchSource
    delete series.fillerEpisodeOffset
    this.clearSeriesFiller(series)
  }

  private clearSeriesFiller(series: Series): void {
    applyFillerToEpisodes(series.episodes, null)
    delete series.fillerStats
  }

  public async enrichSeries(series: Series, opts: EnrichOptions = {}): Promise<EnrichResult> {
    let lookedUp = true
    if (!series.fillerMatchSource) {
      lookedUp = await this.autoMatch(series)
    }

    if (!series.fillerSlug) {
      if (series.fillerMatchSource === 'manual') this.clearSeriesFiller(series)
      return { series, unavailable: !lookedUp }
    }

    const show = await this.getShow(
      series.fillerSlug,
      fillerCacheTtlMs(series.aniListStatus),
      opts.force
    )
    if (!show) {
      return { series, unavailable: true }
    }

    const map = new Map<number, ParsedEpisodeFiller>(
      show.episodes.map(({ epNum, ...info }) => [epNum, info])
    )
    const matched = applyFillerToEpisodes(series.episodes, map, series.fillerEpisodeOffset || 0)
    series.fillerStats = {
      ...show.counts,
      sourceUrl: show.sourceUrl,
      lastSyncedAt: show.lastSyncedAt
    }
    series.lastFillerSyncAt = Date.now()
    series.updatedAt = Date.now()

    console.log(
      `[FillerService] Enriched "${series.title}" from ${show.slug} (${matched} of ${series.episodes.length} episodes matched, ${show.counts.fillerCount} fillers total)`
    )
    return { series, unavailable: false }
  }
}
