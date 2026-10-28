import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { Series, FillerCategory, SeriesFillerStats } from '../shared/types'

interface ParsedEpisodeFiller {
  type: FillerCategory
  label: string
  title: string
}

export class FillerService {
  private cacheDir: string
  private showListCachePath: string
  private cachedShowList: { slug: string; title: string }[] | null = null

  constructor() {
    const userData = app.getPath('userData')
    this.cacheDir = path.join(userData, 'cache', 'filler')
    this.showListCachePath = path.join(this.cacheDir, 'shows_master_list.json')
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true })
      }
    } catch (err) {
      console.error('[FillerService] Failed to create cache dir:', err)
    }
  }

  public generateSlug(title: string): string {
    return title
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/Season \d+/gi, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
  }

  public async getFillerData(
    title: string,
    seriesId: string
  ): Promise<{ episodeMap: Map<number, ParsedEpisodeFiller>; stats: SeriesFillerStats } | null> {
    const cacheFile = path.join(this.cacheDir, `${seriesId}.json`)

    // 1. Check local file cache (valid for 14 days)
    if (fs.existsSync(cacheFile)) {
      try {
        const raw = fs.readFileSync(cacheFile, 'utf8')
        const data = JSON.parse(raw)
        const ageMs = Date.now() - (data.stats?.lastSyncedAt || 0)
        if (ageMs < 14 * 24 * 60 * 60 * 1000 && Array.isArray(data.episodes)) {
          const map = new Map<number, ParsedEpisodeFiller>()
          for (const item of data.episodes) {
            map.set(item.epNum, {
              type: item.type,
              label: item.label,
              title: item.title
            })
          }
          return { episodeMap: map, stats: data.stats }
        }
      } catch (err) {
        console.warn('[FillerService] Error reading filler cache:', err)
      }
    }

    // 2. Fetch from AnimeFillerList
    const directSlug = this.generateSlug(title)
    let parsed = await this.scrapeShowPage(directSlug)

    // Fallback: search directory if direct slug 404s
    if (!parsed) {
      const matchedSlug = await this.findMatchingSlug(title)
      if (matchedSlug && matchedSlug !== directSlug) {
        parsed = await this.scrapeShowPage(matchedSlug)
      }
    }

    if (!parsed) {
      return null
    }

    // 3. Save to disk cache
    try {
      const serializableEpisodes = Array.from(parsed.episodeMap.entries()).map(([epNum, info]) => ({
        epNum,
        ...info
      }))
      fs.writeFileSync(
        cacheFile,
        JSON.stringify(
          {
            stats: parsed.stats,
            episodes: serializableEpisodes
          },
          null,
          2
        ),
        'utf8'
      )
    } catch (err) {
      console.warn('[FillerService] Failed to write cache file:', err)
    }

    return parsed
  }

  private async scrapeShowPage(
    slug: string
  ): Promise<{ episodeMap: Map<number, ParsedEpisodeFiller>; stats: SeriesFillerStats } | null> {
    const url = `https://www.animefillerlist.com/shows/${slug}`
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(8000)
      })

      if (!res.ok) {
        return null
      }

      const html = await res.text()
      const rowRegex =
        /<tr class="([^"]*)"\s+id="eps-(\d+)">[\s\S]*?<td class="Number">(\d+)<\/td>[\s\S]*?<td class="Title"><a[^>]*>([^<]+)<\/a><\/td>[\s\S]*?<td class="Type"><span>([^<]+)<\/span><\/td>/gi

      const episodeMap = new Map<number, ParsedEpisodeFiller>()
      let mangaCanon = 0
      let animeCanon = 0
      let mixedCanon = 0
      let filler = 0

      let match: RegExpExecArray | null
      while ((match = rowRegex.exec(html)) !== null) {
        const epNum = parseInt(match[3], 10)
        const epTitle = match[4].trim()
        const rawType = match[5].trim()
        const cssClass = match[1].toLowerCase()

        let type: FillerCategory = 'manga_canon'
        let label = 'Manga Canon'

        if (cssClass.includes('mixed') || rawType.toLowerCase().includes('mixed')) {
          type = 'mixed_canon'
          label = 'Mixed Canon'
          mixedCanon++
        } else if (cssClass.includes('filler') || rawType.toLowerCase().includes('filler')) {
          type = 'filler'
          label = 'Filler'
          filler++
        } else if (
          cssClass.includes('anime_canon') ||
          rawType.toLowerCase().includes('anime canon')
        ) {
          type = 'anime_canon'
          label = 'Anime Canon'
          animeCanon++
        } else {
          mangaCanon++
        }

        episodeMap.set(epNum, { type, label, title: epTitle })
      }

      if (episodeMap.size === 0) {
        return null
      }

      const total = mangaCanon + animeCanon + mixedCanon + filler
      const fillerPercentage = total > 0 ? Math.round((filler / total) * 100) : 0

      return {
        episodeMap,
        stats: {
          mangaCanonCount: mangaCanon,
          animeCanonCount: animeCanon,
          mixedCanonCount: mixedCanon,
          fillerCount: filler,
          fillerPercentage,
          sourceUrl: url,
          lastSyncedAt: Date.now()
        }
      }
    } catch (err) {
      console.error(`[FillerService] Failed to scrape filler list for ${slug}:`, err)
      return null
    }
  }

  private async findMatchingSlug(queryTitle: string): Promise<string | null> {
    try {
      if (!this.cachedShowList && fs.existsSync(this.showListCachePath)) {
        try {
          const raw = fs.readFileSync(this.showListCachePath, 'utf8')
          this.cachedShowList = JSON.parse(raw)
        } catch {}
      }

      if (!this.cachedShowList) {
        const res = await fetch('https://www.animefillerlist.com/shows', {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          signal: AbortSignal.timeout(8000)
        })
        if (!res.ok) return null
        const html = await res.text()
        const showRegex = /<a href="\/shows\/([^"]+)">([^<]+)<\/a>/gi
        const list: { slug: string; title: string }[] = []
        let match: RegExpExecArray | null
        while ((match = showRegex.exec(html)) !== null) {
          list.push({ slug: match[1], title: match[2].trim() })
        }
        this.cachedShowList = list
        try {
          fs.writeFileSync(this.showListCachePath, JSON.stringify(list, null, 2), 'utf8')
        } catch {}
      }

      const cleanQuery = queryTitle.toLowerCase().replace(/[^a-z0-9]/g, '')
      let bestMatch: string | null = null
      let bestScore = 0

      for (const item of this.cachedShowList || []) {
        const cleanItem = item.title.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (cleanItem === cleanQuery) {
          return item.slug
        }
        if (cleanItem.includes(cleanQuery) || cleanQuery.includes(cleanItem)) {
          const score = Math.min(cleanItem.length, cleanQuery.length)
          if (score > bestScore) {
            bestScore = score
            bestMatch = item.slug
          }
        }
      }

      return bestMatch
    } catch (err) {
      console.warn('[FillerService] Failed to find matching slug:', err)
      return null
    }
  }

  public async enrichSeries(series: Series): Promise<Series> {
    const title = series.aniListTitle || series.title
    const data = await this.getFillerData(title, series.id)
    if (!data) {
      return series
    }

    const { episodeMap, stats } = data

    // Apply filler classification to each episode
    let matchedCount = 0
    for (const ep of series.episodes) {
      if (ep.episodeNumber !== null) {
        const filler = episodeMap.get(ep.episodeNumber)
        if (filler) {
          ep.fillerType = filler.type
          ep.fillerLabel = filler.label
          matchedCount++
        }
      }
    }

    series.fillerStats = stats
    series.lastFillerSyncAt = Date.now()
    series.updatedAt = Date.now()

    console.log(
      `[FillerService] Enriched "${series.title}" with filler data (${matchedCount} of ${series.episodes.length} episodes matched, ${stats.fillerCount} fillers total)`
    )

    return series
  }
}
