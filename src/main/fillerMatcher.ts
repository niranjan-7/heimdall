/**
 * Pure helpers for matching a series to an animefillerlist.com show and for
 * mapping local episode numbers onto the site's absolute numbering.
 *
 * No Electron or network imports: everything here is unit-tested.
 */
import type { FillerCategory } from '../shared/types'
import type { FillerShowEntry, ParsedEpisodeFiller } from './fillerParser'

/** Minimum score for an automatic match. Below this we leave the series unmatched. */
export const AUTO_MATCH_THRESHOLD = 0.88

/** Stop words the site's URL generator drops from slugs ("attack-titan", "made-abyss"). */
const SLUG_STOP_WORDS = new Set([
  'a',
  'an',
  'as',
  'at',
  'before',
  'but',
  'by',
  'for',
  'from',
  'is',
  'in',
  'into',
  'like',
  'of',
  'off',
  'on',
  'onto',
  'per',
  'since',
  'than',
  'the',
  'this',
  'that',
  'to',
  'up',
  'via',
  'with'
])

/** Lower-case, strip accents and punctuation, collapse whitespace. */
export function normalizeTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[×✕]/g, ' x ')
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/** Removes "Season 2", "2nd Season", "Part 2", "Final Season" and similar suffixes. */
export function stripSeasonMarkers(title: string): string {
  return title
    .replace(/\b(the\s+)?final\s+season\b/gi, '')
    .replace(/\bseason\s*\d+\b/gi, '')
    .replace(/\b\d+(st|nd|rd|th)\s+season\b/gi, '')
    .replace(/\b(part|cour)\s*\d+\b/gi, '')
    .replace(/[:\-–]\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripParentheticals(title: string): string {
  return title
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(words: string[]): string {
  return words.join('-')
}

/**
 * Slug guesses for one title, most likely first. The site usually drops stop
 * words ("Attack on Titan" → "attack-titan") but not always.
 */
export function slugCandidatesForTitle(title: string): string[] {
  const out: string[] = []
  for (const variant of [
    title,
    stripParentheticals(title),
    stripSeasonMarkers(stripParentheticals(title))
  ]) {
    const words = normalizeTitle(variant).split(' ').filter(Boolean)
    if (words.length === 0) continue
    const withoutStop = words.filter((w) => !SLUG_STOP_WORDS.has(w))
    if (withoutStop.length > 0) out.push(slugify(withoutStop))
    out.push(slugify(words))
  }
  return [...new Set(out)]
}

/** Slug candidates for an ordered list of titles (English, Romaji, synonyms…). */
export function slugCandidatesFromTitles(titles: Array<string | null | undefined>): string[] {
  const out: string[] = []
  for (const t of titles) {
    if (!t || !t.trim()) continue
    out.push(...slugCandidatesForTitle(t))
  }
  return [...new Set(out)]
}

// ── String similarity ────────────────────────────────────────────────────────

export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1
  if (!a.length || !b.length) return 0
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1)
  const aMatches = new Array<boolean>(a.length).fill(false)
  const bMatches = new Array<boolean>(b.length).fill(false)
  let matches = 0
  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - range)
    const hi = Math.min(i + range + 1, b.length)
    for (let j = lo; j < hi; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue
      aMatches[i] = true
      bMatches[j] = true
      matches++
      break
    }
  }
  if (matches === 0) return 0
  let t = 0
  let k = 0
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue
    while (!bMatches[k]) k++
    if (a[i] !== b[k]) t++
    k++
  }
  const jaro = (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3
  let prefix = 0
  while (prefix < 4 && prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++
  return jaro + prefix * 0.1 * (1 - jaro)
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

/** Levenshtein ratio of the alphabetically sorted tokens (word order does not matter). */
export function tokenSortRatio(a: string, b: string): number {
  const sa = a.split(' ').filter(Boolean).sort().join(' ')
  const sb = b.split(' ').filter(Boolean).sort().join(' ')
  if (!sa.length && !sb.length) return 1
  return 1 - levenshtein(sa, sb) / Math.max(sa.length, sb.length)
}

/**
 * Similarity of two already-normalised titles in [0, 1]. Blends Jaro-Winkler on
 * the compacted strings (robust to spacing and hyphens) with a token-sort
 * ratio (robust to word order). Both must agree for a high score, so "Naruto"
 * does not match "Naruto Shippuden" strongly.
 */
export function titleSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  const ca = a.replace(/ /g, '')
  const cb = b.replace(/ /g, '')
  if (ca === cb) return 0.99
  return (jaroWinkler(ca, cb) + tokenSortRatio(a, b)) / 2
}

interface WeightedVariant {
  text: string
  weight: number
}

/** Full title first; alternatives (parenthetical stripped / contents) slightly penalised. */
function showTitleVariants(title: string): WeightedVariant[] {
  const variants: WeightedVariant[] = [{ text: normalizeTitle(title), weight: 1 }]
  const base = stripParentheticals(title)
  if (base !== title) variants.push({ text: normalizeTitle(base), weight: 0.97 })
  for (const m of title.matchAll(/\(([^)]*)\)/g)) {
    const inner = m[1].trim()
    // "(2011)" alone is not a title.
    if (inner && !/^\d{4}$/.test(inner))
      variants.push({ text: normalizeTitle(inner), weight: 0.97 })
  }
  return variants.filter((v) => v.text.length > 0)
}

function queryVariants(title: string): WeightedVariant[] {
  const variants: WeightedVariant[] = [{ text: normalizeTitle(title), weight: 1 }]
  const base = stripParentheticals(title)
  if (base !== title) variants.push({ text: normalizeTitle(base), weight: 0.97 })
  const noSeason = stripSeasonMarkers(base)
  if (noSeason !== base) variants.push({ text: normalizeTitle(noSeason), weight: 0.97 })
  return variants.filter((v) => v.text.length > 0)
}

export interface ShowMatch {
  slug: string
  title: string
  score: number
}

/**
 * Ranks shows in the master list against a set of query titles (AniList
 * English, Romaji, synonyms, or the folder name as a last resort). Earlier
 * titles are trusted slightly more than later ones.
 */
export function rankShows(
  queryTitles: Array<string | null | undefined>,
  shows: FillerShowEntry[],
  limit = 10
): ShowMatch[] {
  const titles = queryTitles.filter((t): t is string => Boolean(t && t.trim()))
  if (titles.length === 0 || shows.length === 0) return []

  const queries: WeightedVariant[] = []
  titles.forEach((t, i) => {
    const orderWeight = i === 0 ? 1 : 0.995
    for (const v of queryVariants(t)) queries.push({ text: v.text, weight: v.weight * orderWeight })
  })
  const slugSet = new Set(slugCandidatesFromTitles(titles))

  const scored: ShowMatch[] = shows.map((show) => {
    let best = 0
    for (const sv of showTitleVariants(show.title)) {
      for (const q of queries) {
        const s = titleSimilarity(q.text, sv.text) * sv.weight * q.weight
        if (s > best) best = s
      }
    }
    // A slug that exactly equals one derived from the titles is strong evidence.
    if (slugSet.has(show.slug)) best = Math.max(best, 0.95)
    return { slug: show.slug, title: show.title, score: Math.round(best * 1000) / 1000 }
  })

  return scored.sort((a, b) => b.score - a.score || a.title.length - b.title.length).slice(0, limit)
}

/** Best show above the auto-match threshold, or null. */
export function bestShowMatch(
  queryTitles: Array<string | null | undefined>,
  shows: FillerShowEntry[],
  threshold = AUTO_MATCH_THRESHOLD
): ShowMatch | null {
  const [top] = rankShows(queryTitles, shows, 1)
  return top && top.score >= threshold ? top : null
}

/** Case-insensitive substring/fuzzy search for the "Fix filler match" modal. */
export function searchShows(
  query: string,
  shows: FillerShowEntry[],
  limit = 50
): FillerShowEntry[] {
  const q = normalizeTitle(query)
  if (!q) return shows.slice(0, limit)
  const contains = shows.filter(
    (s) => normalizeTitle(s.title).includes(q) || s.slug.includes(q.replace(/ /g, '-'))
  )
  if (contains.length >= limit) return contains.slice(0, limit)
  const rest = rankShows([query], shows, limit)
    .filter((m) => m.score >= 0.6 && !contains.some((c) => c.slug === m.slug))
    .map((m) => ({ slug: m.slug, title: m.title }))
  return [...contains, ...rest].slice(0, limit)
}

// ── Episode alignment ───────────────────────────────────────────────────────

export interface PrequelInfo {
  /** Filler slug this prequel matches (null when it matched nothing). */
  slug: string | null
  episodes: number | null
}

/**
 * animefillerlist numbers episodes absolutely across all seasons of a show.
 * Given the prequel chain (nearest first) and the slug the series matched,
 * sums the episode counts of earlier seasons that share the same filler page.
 * Stops at the first prequel that belongs to another page or has no count.
 */
export function prequelEpisodeTotal(slug: string, prequels: PrequelInfo[]): number {
  let total = 0
  for (const p of prequels) {
    if (p.slug !== slug || !p.episodes || p.episodes <= 0) break
    total += p.episodes
  }
  return total
}

/**
 * Decides the episode offset to add to local numbers. When local files are
 * already numbered absolutely (lowest number is past the earlier seasons) no
 * offset is needed.
 */
export function computeEpisodeOffset(
  localEpisodeNumbers: Array<number | null | undefined>,
  earlierSeasonEpisodes: number
): number {
  if (earlierSeasonEpisodes <= 0) return 0
  const nums = localEpisodeNumbers.filter((n): n is number => typeof n === 'number' && n > 0)
  if (nums.length === 0) return 0
  const min = Math.min(...nums)
  return min > earlierSeasonEpisodes ? 0 : earlierSeasonEpisodes
}

/** Local episode number → number on the filler page. */
export function toFillerEpisodeNumber(
  localEpisode: number | null | undefined,
  offset = 0
): number | null {
  if (typeof localEpisode !== 'number' || !Number.isFinite(localEpisode)) return null
  return localEpisode + (Number.isFinite(offset) ? Math.trunc(offset) : 0)
}

// ── Cache policy ────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000
export const AIRING_CACHE_TTL_MS = 14 * DAY_MS
export const FINISHED_CACHE_TTL_MS = 90 * DAY_MS

/** 90 days for shows AniList marks FINISHED (or CANCELLED), 14 days otherwise. */
export function fillerCacheTtlMs(aniListStatus: string | null | undefined): number {
  const s = (aniListStatus || '').toUpperCase()
  return s === 'FINISHED' || s === 'CANCELLED' ? FINISHED_CACHE_TTL_MS : AIRING_CACHE_TTL_MS
}

export function isCacheFresh(
  lastSyncedAt: number | null | undefined,
  aniListStatus: string | null | undefined,
  now = Date.now()
): boolean {
  if (!lastSyncedAt) return false
  return now - lastSyncedAt < fillerCacheTtlMs(aniListStatus)
}

// ── Request throttle ────────────────────────────────────────────────────────

/**
 * Serialises calls so that each one starts at least `intervalMs` after the
 * previous one started. Used to keep animefillerlist requests at ≤ 1/sec.
 */
export function createThrottle(
  intervalMs: number,
  now: () => number = Date.now,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))
): <T>(fn: () => Promise<T>) => Promise<T> {
  let chain: Promise<unknown> = Promise.resolve()
  let lastStart = -Infinity
  return <T>(fn: () => Promise<T>): Promise<T> => {
    const run = chain.then(async () => {
      const wait = lastStart + intervalMs - now()
      if (wait > 0) await sleep(wait)
      lastStart = now()
      return fn()
    })
    chain = run.catch(() => undefined)
    return run
  }
}

// ── Applying data to episodes ───────────────────────────────────────────────

interface FillerTarget {
  episodeNumber: number | null
  fillerType?: FillerCategory
  fillerLabel?: string
}

/**
 * Writes filler type/label onto episodes (after applying the offset) and
 * clears it from episodes the page does not cover. Returns how many matched.
 */
export function applyFillerToEpisodes(
  episodes: FillerTarget[],
  map: Map<number, ParsedEpisodeFiller> | null,
  offset = 0
): number {
  let matched = 0
  for (const ep of episodes) {
    const n = toFillerEpisodeNumber(ep.episodeNumber, offset)
    const info = n !== null && map ? map.get(n) : undefined
    if (info) {
      ep.fillerType = info.type
      ep.fillerLabel = info.label
      matched++
    } else {
      delete ep.fillerType
      delete ep.fillerLabel
    }
  }
  return matched
}
