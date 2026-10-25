import * as fs from 'fs'
import * as path from 'path'
import { Episode, Series } from '../shared/types'

const SUPPORTED_EXTENSIONS = new Set(['.mkv', '.mp4', '.avi', '.webm', '.m4v'])

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

interface DiscoveredFile {
  filePath: string
  fileName: string
  subfolderName: string
}

export function extractEpisodeNumber(fileName: string): number | null {
  const nameWithoutExt = path.parse(fileName).name

  // Match patterns like S01E05, S1E5, E05, EP05, Ep. 05, etc.
  const epMatch = /(?:s\d+)?\s*(?:e|ep|episode)\.?\s*(\d+)/i.exec(nameWithoutExt)
  if (epMatch && epMatch[1]) {
    return parseInt(epMatch[1], 10)
  }

  // Match patterns like "Series Name - 150", "Series - 01", "150.mkv"
  const dashMatch = /(?:^|\s|-|_|\[|\()(\d{1,4})(?:\s|-|_|\]|\)|$)/.exec(nameWithoutExt)
  if (dashMatch && dashMatch[1]) {
    return parseInt(dashMatch[1], 10)
  }

  return null
}

export function cleanEpisodeTitle(fileName: string): string {
  const parsed = path.parse(fileName)
  let name = parsed.name

  // Strip common bracketed release groups: [SubsPlease], [Erai-raws], [1080p], (Dual Audio), etc.
  name = name.replace(/\[[^\]]*\]/g, ' ')
  name = name.replace(/\([^)]*(?:1080p|720p|480p|x264|x265|hevc|web-dl|bluray)[^)]*\)/gi, ' ')
  name = name.replace(/\b(?:1080p|720p|480p|x264|x265|HEVC|AV1|AAC|DDP|FLAC)\b/gi, ' ')
  name = name.replace(/[._]/g, ' ')
  name = name.replace(/\s+/g, ' ').trim()

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

  // Natural Numerical Sorting using Intl.Collator with { numeric: true, sensitivity: 'base' }
  // We sort first by season/subfolder, then by filename
  discovered.sort((a, b) => {
    // If different subfolder, compare subfolders naturally
    if (a.subfolderName !== b.subfolderName) {
      return collator.compare(a.subfolderName, b.subfolderName)
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

  // Derive series title from root folder basename
  let seriesTitle = path.basename(rootPath)
  if (!seriesTitle || seriesTitle === '.' || seriesTitle === '/') {
    seriesTitle = 'Series'
  }

  return { episodes, title: seriesTitle }
}
