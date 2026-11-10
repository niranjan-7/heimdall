/**
 * Pure HTML parsing for animefillerlist.com pages.
 *
 * Kept free of Electron and network code so it can be tested against saved
 * pages in `tests/fixtures/filler/`.
 */
import { FillerCategory, SeriesFillerStats } from '../shared/types'

export interface ParsedEpisodeFiller {
  type: FillerCategory
  label: string
  title: string
}

export interface FillerShowEntry {
  /** Path segment as used in `/shows/<slug>` (kept URL-encoded). */
  slug: string
  title: string
}

export interface ParsedShowPage {
  episodes: Map<number, ParsedEpisodeFiller>
  counts: Omit<SeriesFillerStats, 'sourceUrl' | 'lastSyncedAt'>
}

const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' '
}

export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1] === 'x' || code[1] === 'X'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole
    }
    return ENTITY_MAP[code.toLowerCase()] ?? whole
  })
}

const LABELS: Record<FillerCategory, string> = {
  manga_canon: 'Manga Canon',
  anime_canon: 'Anime Canon',
  mixed_canon: 'Mixed Canon',
  filler: 'Filler'
}

export function classifyEpisodeType(cssClass: string, typeText: string): FillerCategory {
  const css = cssClass.toLowerCase()
  const text = typeText.toLowerCase()
  if (css.includes('mixed') || text.includes('mixed')) return 'mixed_canon'
  if (css.includes('filler') || text.includes('filler')) return 'filler'
  if (css.includes('anime_canon') || text.includes('anime canon')) return 'anime_canon'
  return 'manga_canon'
}

/**
 * Parses a show page (`/shows/<slug>`). Returns an empty episode map when the
 * page has no recognisable episode table (layout change, error page, etc.).
 */
export function parseShowPage(html: string): ParsedShowPage {
  const episodes = new Map<number, ParsedEpisodeFiller>()
  const counts = {
    mangaCanonCount: 0,
    animeCanonCount: 0,
    mixedCanonCount: 0,
    fillerCount: 0,
    fillerPercentage: 0
  }

  // One <tr> per episode; parse each row's cells independently so that a new
  // column or reordered attributes do not break the whole page.
  const rowRegex = /<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi
  let row: RegExpExecArray | null
  while ((row = rowRegex.exec(html)) !== null) {
    const attrs = row[1]
    const body = row[2]
    const numberMatch = /<td[^>]*class="[^"]*\bNumber\b[^"]*"[^>]*>\s*(\d+)\s*<\/td>/i.exec(body)
    if (!numberMatch) continue
    const epNum = parseInt(numberMatch[1], 10)
    if (!Number.isFinite(epNum)) continue

    const cssClass = /class="([^"]*)"/i.exec(attrs)?.[1] ?? ''
    const typeText =
      /<td[^>]*class="[^"]*\bType\b[^"]*"[^>]*>([\s\S]*?)<\/td>/i
        .exec(body)?.[1]
        .replace(/<[^>]+>/g, '') ?? ''
    const titleHtml =
      /<td[^>]*class="[^"]*\bTitle\b[^"]*"[^>]*>([\s\S]*?)<\/td>/i.exec(body)?.[1] ?? ''
    const title = decodeHtmlEntities(titleHtml.replace(/<[^>]+>/g, '')).trim()

    if (!cssClass && !typeText.trim()) continue

    const type = classifyEpisodeType(cssClass, typeText)
    if (episodes.has(epNum)) continue
    episodes.set(epNum, { type, label: LABELS[type], title })

    if (type === 'filler') counts.fillerCount++
    else if (type === 'mixed_canon') counts.mixedCanonCount++
    else if (type === 'anime_canon') counts.animeCanonCount++
    else counts.mangaCanonCount++
  }

  const total = episodes.size
  counts.fillerPercentage = total > 0 ? Math.round((counts.fillerCount / total) * 100) : 0
  return { episodes, counts }
}

/** Parses the master show list (`/shows`). */
export function parseShowList(html: string): FillerShowEntry[] {
  const start = html.indexOf('id="ShowList"')
  const scope = start >= 0 ? html.slice(start) : html
  const linkRegex =
    /<a\s+href="(?:https?:\/\/(?:www\.)?animefillerlist\.com)?\/shows\/([^"/?#]+)"\s*>([^<]+)<\/a>/gi
  const seen = new Set<string>()
  const list: FillerShowEntry[] = []
  let m: RegExpExecArray | null
  while ((m = linkRegex.exec(scope)) !== null) {
    const slug = m[1]
    if (slug === 'latest-updates' || seen.has(slug)) continue
    const title = decodeHtmlEntities(m[2]).replace(/\s+/g, ' ').trim()
    if (!title) continue
    seen.add(slug)
    list.push({ slug, title })
  }
  return list
}
