import * as fs from 'fs'
import * as path from 'path'
import { Episode } from '../shared/types'

const SUPPORTED_EXTENSIONS = new Set(['.mkv', '.mp4', '.avi', '.webm', '.m4v'])

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

interface DiscoveredFile {
  filePath: string
  fileName: string
  subfolderName: string
}

// ── Episode file-name parsing ───────────────────────────────────────────────

/** Release/technical tags that are never part of a title. Removed everywhere. */
const TECH_TAGS =
  /\b(?:2160p|1440p|1080p|1080i|720p|576p|480p|360p|4k|uhd|hdr10\+?|hdr|sdr|x264|x265|h[ .]?264|h[ .]?265|hevc|avc|av1|vp9|xvid|divx|aac(?:2[ .]0|5[ .]1)?|e?ac3|dts(?:-hd)?|truehd|atmos|ddp?(?:2[ .]0|5[ .]1|7[ .]1)?|flac|opus|mp3|hi10p?|hi444pp?|8bit|10bit|10-bit|web-?dl|web-?rip|bluray|blu-ray|bdrip|bdremux|brrip|dvdrip|hdtv|hdrip|remux|dual[ -]?audio|multi[ -]?subs?|multi-?audio)\b/gi

/**
 * Tokens that start the trailing junk of a scene-style name ("Show.S01E05.Pilot.720p.WEB.x264-GRP").
 * Too short or common to remove everywhere, so only used to cut the episode title.
 */
const SCENE_TAIL =
  /\b(?:web|bd|dvd|amzn|nf|cr|dsnp|hmax|atvp|hulu|proper|repack|internal|uncensored|uncut|batch)\b/i

/** Names of extras that are not regular episodes. */
const SPECIAL_RE =
  /(?:^|\s)(?:ova|oad|sp|specials?|recap|preview|pv|trailer|teaser|creditless|menu|extras?|bonus)(?:\s*\d{1,3}(?:v\d)?)?(?:\s+-\s+.*)?$/i
const CREDITLESS_RE = /\bnc(?:op|ed)\s*\d*\b|\b(?:op|ed)\s*\d{1,2}\b(?!\s*-)\s*$/i

interface PreparedName {
  /** Name with tags removed and separators turned into spaces. */
  text: string
}

function prepareEpisodeName(fileName: string): PreparedName {
  let name = path.parse(fileName).name

  name = name.replace(/\[[^\]]*\]|\{[^}]*\}/g, ' ')
  // "(episode)" / "(ep)" become plain words so the suffix pattern can see them.
  name = name.replace(/\(\s*(episode|epi|eps|ep)\s*\)/gi, ' $1 ')
  // Parentheses with tags, years or CRCs: "(1080p)", "(2014)", "(ABCD1234)".
  name = name.replace(/\(([^)]*)\)/g, (whole, inner: string) => {
    const t = inner.replace(/[._]/g, ' ').trim()
    TECH_TAGS.lastIndex = 0
    if (TECH_TAGS.test(t) || /^(?:19|20)\d\d$/.test(t) || /^[0-9a-f]{8}$/i.test(t)) return ' '
    return whole
  })
  TECH_TAGS.lastIndex = 0

  // Dots and underscores are separators, except in decimals like "05.5".
  name = name.replace(/(\d)\.(\d)(?!\d)/g, '$1\uE000$2')
  name = name.replace(/[._]/g, ' ').replace(/\uE000/g, '.')

  name = name.replace(TECH_TAGS, ' ')
  name = name.replace(/\b\d{3,4}x\d{3,4}\b/g, ' ') // 1920x1080
  name = name.replace(/\b[0-9a-f]{8}\b/gi, (m) => (/[a-f]/i.test(m) ? ' ' : m)) // CRC32
  // Season markers are not episode numbers.
  name = name.replace(/\b(?:the\s+)?final\s+season\b/gi, ' ')
  name = name.replace(/\bseason\s*\d+\b|\b\d+(?:st|nd|rd|th)\s+season\b/gi, ' ')
  name = name.replace(/\b(?:part|cour)\s*\d+\s+(?=-)/gi, ' ')
  name = name.replace(/\bS\d{1,2}\b(?!\s*E\d)/gi, ' ')
  // Release years.
  name = name.replace(/\b(?:19\d\d|20\d\d)\b/g, ' ')
  // "END" / "FINAL" markers on the last episode.
  name = name.replace(/\s(?:end|final)\s*$/i, ' ')

  return { text: name.replace(/\s+/g, ' ').trim() }
}

interface EpisodeParse {
  episode: number | null
  /** Scene-style name with no spaces ("Show.S01E05.Title.720p-GRP"). */
  scene: boolean
  /** Text after the episode number (raw, before title clean-up). */
  rest: string
  text: string
}

interface Candidate {
  value: number
  start: number
  end: number
}

function pickDelimitedNumber(text: string): Candidate | null {
  const re = /(?<=^|[\s\-#~])(\d{1,4})(?:v\d{1,2})?(?=$|[\s\-~])/g
  const all: Candidate[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    all.push({ value: parseInt(m[1], 10), start: m.index, end: m.index + m[0].length })
  }
  if (all.length === 0) return null

  const afterDash = all.filter(
    (c) => /(?:^|\s)-\s*$/.test(text.slice(0, c.start)) || /-$/.test(text.slice(0, c.start))
  )
  const endsSegment = (c: Candidate): boolean => /^\s*(?:$|-\s)/.test(text.slice(c.end))
  // 1. "Show - 05", "Mob Psycho 100 - 03", "86 - Eighty Six - 05"
  const cleanAfterDash = afterDash.filter(endsSegment)
  if (cleanAfterDash.length > 0) return cleanAfterDash[cleanAfterDash.length - 1]
  // 2. "Show - 05 Title words"
  if (afterDash.length > 0) return afterDash[0]
  // 3. "Naruto Shippuden 001 - Homecoming"
  const beforeDash = all.find((c) => /^\s*-\s/.test(text.slice(c.end)))
  if (beforeDash) return beforeDash
  // 4. "Fairy Tail 154"
  return all[all.length - 1]
}

function parseEpisodeName(fileName: string): EpisodeParse {
  const { text } = prepareEpisodeName(fileName)
  const scene = !/\s/.test(path.parse(fileName).name)
  const none = { episode: null, scene, rest: '', text }

  // SxxEyy (first episode of a double "S01E05E06") and 1x05.
  const sxe =
    /\bS\d{1,2}\s?E(\d{1,4})(?:v\d)?(?:E\d{1,4})?/i.exec(text) ||
    /\b\d{1,2}x(\d{2,4})\b/i.exec(text)
  if (sxe)
    return {
      episode: parseInt(sxe[1], 10),
      rest: text.slice(sxe.index + sxe[0].length),
      text,
      scene
    }

  if (CREDITLESS_RE.test(text) || SPECIAL_RE.test(text)) return none
  // Recaps numbered between episodes ("05.5").
  if (/(?:^|[\s-])\d{1,4}\.\d(?=$|[\s-])/.test(text)) return none

  // "Episode 05", "Ep. 5", "E05", "epi - 123", "#05"
  const prefix =
    /(?:^|\s)(?:episode|epi|eps|ep|e)\s*\.?\s*[-#]?\s*(\d{1,4})(?:v\d{1,2})?(?=$|[\s\-~])/i.exec(
      text
    )
  if (prefix)
    return {
      episode: parseInt(prefix[1], 10),
      rest: text.slice(prefix.index + prefix[0].length),
      text,
      scene
    }

  // "124 episode", "124 - ep"
  const suffix = /(?:^|\s)(\d{1,4})\s*-?\s*(?:episode|epi|eps|ep)\b/i.exec(text)
  if (suffix)
    return {
      episode: parseInt(suffix[1], 10),
      rest: text.slice(suffix.index + suffix[0].length),
      text,
      scene
    }

  const c = pickDelimitedNumber(text)
  if (c) return { episode: c.value, rest: text.slice(c.end), text, scene }
  return none
}

/**
 * Episode number from a file name, or null for extras (OVA, NCOP, recaps)
 * and names without one. Handles fansub ("[Group] Show - 05v2 [1080p]"),
 * scene ("Show.S01E05.1080p.WEB-DL"), Plex ("Show - S02E15 - Title"),
 * absolute ("One Piece - 1047") and numbers inside titles ("Mob Psycho 100 - 03").
 */
export function extractEpisodeNumber(fileName: string): number | null {
  return parseEpisodeName(fileName).episode
}

function cleanTitleRest(rest: string, scene: boolean): string {
  let t = rest.replace(/^[\s\-–—:~.,]+/, '')
  const tail = SCENE_TAIL.exec(t)
  if (tail) t = t.slice(0, tail.index)
  // Release group glued on with a dash at the end of scene names ("x264-GROUP").
  if (scene) t = t.replace(/\s*-[A-Za-z0-9]+\s*$/, '')
  return t
    .replace(/[\s\-–—:~.,]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Display title: "Episode 5" or "Episode 5 — Title" when the file name has
 * an episode title after the number. Falls back to the cleaned file name.
 */
export function cleanEpisodeTitle(fileName: string): string {
  const parsed = parseEpisodeName(fileName)
  if (parsed.episode !== null) {
    const title = cleanTitleRest(parsed.rest, parsed.scene)
    if (title.length > 2 && !/^\d+$/.test(title)) return `Episode ${parsed.episode} — ${title}`
    return `Episode ${parsed.episode}`
  }

  const base = path.parse(fileName).name
  TECH_TAGS.lastIndex = 0
  const name = base
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\(([^)]*)\)/g, (whole, inner: string) => {
      TECH_TAGS.lastIndex = 0
      return TECH_TAGS.test(inner) ? ' ' : whole
    })
    .replace(/[._]/g, ' ')
    .replace(TECH_TAGS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return name || base
}

function scanDirectoryRecursively(
  currentDir: string,
  baseDir: string,
  discovered: DiscoveredFile[]
): void {
  let entries: fs.Dirent[] = []
  try {
    entries = fs.readdirSync(currentDir, { withFileTypes: true })
  } catch (err) {
    console.error(`Failed to read directory: ${currentDir}`, err)
    return
  }

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name)
    if (entry.isDirectory()) {
      // Don't recurse into hidden folders
      if (!entry.name.startsWith('.')) {
        scanDirectoryRecursively(fullPath, baseDir, discovered)
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        // Determine relative subfolder name
        const relDir = path.relative(baseDir, currentDir)
        let subfolder = relDir ? relDir.split(path.sep)[0] : 'Season 1'
        if (!relDir || relDir === '.') {
          subfolder = 'Season 1'
        }
        discovered.push({
          filePath: fullPath,
          fileName: entry.name,
          subfolderName: subfolder
        })
      }
    }
  }
}

export function scanSeriesFolders(
  rootPath: string,
  additionalPaths: string[] = [],
  existingEpisodes: Episode[] = []
): { episodes: Episode[]; title: string } {
  const discovered: DiscoveredFile[] = []

  // Map existing episodes by filePath to preserve watched progress, duration, etc.
  const existingMap = new Map<string, Episode>()
  for (const ep of existingEpisodes) {
    existingMap.set(path.normalize(ep.filePath).toLowerCase(), ep)
  }

  // 1. Scan root folder
  if (fs.existsSync(rootPath)) {
    scanDirectoryRecursively(rootPath, rootPath, discovered)
  }

  // 2. Scan additional season folders
  for (const addPath of additionalPaths) {
    if (fs.existsSync(addPath)) {
      const parentDir = path.dirname(addPath)
      scanDirectoryRecursively(addPath, parentDir, discovered)
    }
  }

  // Intelligent Episode-First Sorter:
  // Sorts by season/subfolder first, then by numerical episode number,
  // guaranteeing Episode 123 is immediately followed by Episode 124 regardless of naming style!
  discovered.sort((a, b) => {
    // If different subfolder, compare subfolders naturally
    if (a.subfolderName !== b.subfolderName) {
      return collator.compare(a.subfolderName, b.subfolderName)
    }

    const epNumA = extractEpisodeNumber(a.fileName)
    const epNumB = extractEpisodeNumber(b.fileName)

    if (epNumA !== null && epNumB !== null && epNumA !== epNumB) {
      return epNumA - epNumB
    }

    // Compare filenames naturally
    return collator.compare(a.fileName, b.fileName)
  })

  // Check if all files ended up in 'Season 1' because there were no subfolders
  const distinctSubfolders = new Set(discovered.map((d) => d.subfolderName))
  const isFlat = distinctSubfolders.size <= 1

  const discoveredKeys = new Set(discovered.map((d) => path.normalize(d.filePath).toLowerCase()))

  // Extras (OVA, NCOP, recaps) have no episode number. Only invent one from the
  // file order when the folder has no numbered files at all; otherwise a made-up
  // number would collide with a real episode (and could be scrobbled).
  const anyNumbered = discovered.some((d) => extractEpisodeNumber(d.fileName) !== null)

  const episodes: Episode[] = discovered.map((item, index) => {
    const normalizedKey = path.normalize(item.filePath).toLowerCase()
    const existing = existingMap.get(normalizedKey)

    const epNum = extractEpisodeNumber(item.fileName)
    const cleanTitle = cleanEpisodeTitle(item.fileName)

    const seasonName = isFlat ? 'All Episodes' : item.subfolderName

    if (existing) {
      return {
        ...existing,
        fileName: item.fileName,
        title: cleanTitle,
        seasonName,
        seasonFolder: item.subfolderName,
        episodeNumber: epNum !== null ? epNum : anyNumbered ? null : index + 1,
        fileMissing: false
      }
    }

    return {
      id: `ep_${Buffer.from(item.filePath).toString('base64url').substring(0, 32)}_${index}`,
      filePath: item.filePath,
      fileName: item.fileName,
      title: cleanTitle,
      seasonName,
      seasonFolder: item.subfolderName,
      episodeNumber: epNum !== null ? epNum : anyNumbered ? null : index + 1,
      timeSec: 0,
      durationSec: 0,
      completed: false,
      lastWatchedAt: null,
      fileMissing: false
    }
  })

  // Data Preservation Rule: Retain completed episodes whose video files were deleted from disk to save space
  for (const [key, existing] of existingMap.entries()) {
    if (existing.completed && !discoveredKeys.has(key)) {
      episodes.push({
        ...existing,
        fileMissing: true
      })
    }
  }

  // Sort numerically by episodeNumber; extras without a number go last.
  episodes.sort((a, b) => {
    if (a.episodeNumber === null && b.episodeNumber !== null) return 1
    if (a.episodeNumber !== null && b.episodeNumber === null) return -1
    if (
      a.episodeNumber !== null &&
      b.episodeNumber !== null &&
      a.episodeNumber !== b.episodeNumber
    ) {
      return a.episodeNumber - b.episodeNumber
    }
    return collator.compare(a.title, b.title)
  })

  // Derive series title from root folder name
  const rawFolderName = path.basename(rootPath)
  const title = rawFolderName.replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim()

  return { episodes, title }
}
