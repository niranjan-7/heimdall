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

/**
 * Intelligent multi-stage episode number extractor.
 * Handles irregular naming schemes:
 * - "epi - 123", "epi-123", "epi 123"
 * - "124(episode)", "124 (ep)", "124 episode"
 * - "Fairy Tail 154.mkv"
 * - "[SubGroup] Show - S02E15 [1080p].mkv"
 * - "Show (2014) - 05.mkv" (prevents year 2014 from being mistaken for ep 2014)
 */
export function extractEpisodeNumber(fileName: string): number | null {
  const parsed = path.parse(fileName)
  let name = parsed.name

  // Stage 1: Strip bracketed release tags: [SubsPlease], [Erai-raws], [1080p], [HEVC], etc.
  name = name.replace(/\[[^\]]*\]/g, ' ')

  // Stage 2: Strip parentheses that contain video/audio tech specs or release years:
  // e.g. (1080p), (2014), (Dual Audio), (x265), (BluRay)
  name = name.replace(
    /\([^)]*(?:1080p|720p|480p|2160p|4k|x264|x265|hevc|web-dl|bluray|dual\s*audio|flac|aac|19\d\d|20\d\d)[^)]*\)/gi,
    ' '
  )

  // Stage 3: Strip standalone tech spec tokens and years so their numbers don't conflict
  name = name.replace(/\b(?:1080p|720p|480p|2160p|4k|x264|x265|hevc|av1|aac|dts|ddp|flac|hi10p|8bit|10bit)\b/gi, ' ')
  name = name.replace(/\b(?:19\d\d|20\d\d)\b/g, ' ')

  // Pattern A: Standard prefix: S01E05, S1E5, E05, EP05, Ep. 05, Epi - 05, Episode 05, etc.
  const epMatch = /(?:s\d+)?\s*(?:e|ep|epi|eps|episode)\.?\s*-?\s*(\d+)/i.exec(name)
  if (epMatch && epMatch[1]) {
    return parseInt(epMatch[1], 10)
  }

  // Pattern B: Suffix pattern: "124(episode)", "124 (ep)", "124 episode", "124 - episode"
  const suffixMatch = /(\d+)\s*(?:\(|\[|-)?\s*(?:episode|ep|epi|eps)\b/i.exec(name)
  if (suffixMatch && suffixMatch[1]) {
    return parseInt(suffixMatch[1], 10)
  }

  // Pattern C: Delimited number: "Fairy Tail 154", "Series - 01", "150.mkv"
  const dashMatch = /(?:^|\s|-|_|#)(\d{1,4})(?:\s|-|_|\.|$)(?!\d)/.exec(name)
  if (dashMatch && dashMatch[1]) {
    return parseInt(dashMatch[1], 10)
  }

  return null
}

/**
 * Generates a clean, normalized episode title.
 * Strips release tags, technical specs, and messy prefixes.
 */
export function cleanEpisodeTitle(fileName: string): string {
  const parsed = path.parse(fileName)
  let name = parsed.name

  // Strip bracketed groups: [SubsPlease], [1080p], etc.
  name = name.replace(/\[[^\]]*\]/g, ' ')
  // Strip tech spec parentheses
  name = name.replace(
    /\([^)]*(?:1080p|720p|480p|2160p|4k|x264|x265|hevc|web-dl|bluray|dual\s*audio|flac|aac)[^)]*\)/gi,
    ' '
  )
  name = name.replace(/\b(?:1080p|720p|480p|2160p|4k|x264|x265|HEVC|AV1|AAC|DDP|FLAC)\b/gi, ' ')
  name = name.replace(/[._]/g, ' ')
  name = name.replace(/\s+/g, ' ').trim()

  const epNum = extractEpisodeNumber(fileName)
  if (epNum !== null) {
    // Check if there is a distinct chapter/story title after the episode number
    const titleAfterEp = name.replace(new RegExp(`^(?:.*?)(?:ep|epi|episode)?\\s*-?\\s*${epNum}\\s*-?\\s*`, 'i'), '').trim()
    if (titleAfterEp && titleAfterEp.length > 2 && !/^\d+$/.test(titleAfterEp)) {
      return `Episode ${epNum} — ${titleAfterEp}`
    }
    return `Episode ${epNum}`
  }

  return name || parsed.name
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
        episodeNumber: epNum !== null ? epNum : index + 1
      }
    }

    return {
      id: `ep_${Buffer.from(item.filePath).toString('base64url').substring(0, 32)}_${index}`,
      filePath: item.filePath,
      fileName: item.fileName,
      title: cleanTitle,
      seasonName,
      seasonFolder: item.subfolderName,
      episodeNumber: epNum !== null ? epNum : index + 1,
      timeSec: 0,
      durationSec: 0,
      completed: false,
      lastWatchedAt: null
    }
  })

  // Derive series title from root folder name
  const rawFolderName = path.basename(rootPath)
  const title = rawFolderName.replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim()

  return { episodes, title }
}
