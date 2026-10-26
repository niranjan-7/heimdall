import * as fs from 'fs'
import * as path from 'path'
import { Movie } from '../shared/types'
import { parseMovieFileName, extractTechnicalSpecs } from './movieParser'

const SUPPORTED_EXTENSIONS = new Set(['.mkv', '.mp4', '.avi', '.webm', '.m4v'])

interface RawDiscoveredMovieFile {
  filePath: string
  fileName: string
  cleanTitle: string
  year: number | null
  partNumber: number | null
  baseGroupKey: string
  fileSize: number
}

function scanMovieDirectoryRecursively(
  dir: string,
  discovered: RawDiscoveredMovieFile[]
): void {
  let entries: fs.Dirent[] = []
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.')) {
        scanMovieDirectoryRecursively(fullPath, discovered)
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        const parsed = parseMovieFileName(entry.name)
        let fileSize = 0
        try {
          fileSize = fs.statSync(fullPath).size
        } catch {
          // ignore
        }

        discovered.push({
          filePath: fullPath,
          fileName: entry.name,
          cleanTitle: parsed.cleanTitle,
          year: parsed.year,
          partNumber: parsed.partNumber,
          baseGroupKey: parsed.baseGroupKey,
          fileSize
        })
      }
    }
  }
}

export async function scanMoviesFolder(
  folderPath: string,
  existingMovies: Movie[] = []
): Promise<Movie[]> {
  const discovered: RawDiscoveredMovieFile[] = []
  if (fs.existsSync(folderPath)) {
    scanMovieDirectoryRecursively(folderPath, discovered)
  }

  // Map existing movies by normalized primary file path
  const existingMap = new Map<string, Movie>()
  for (const m of existingMovies) {
    existingMap.set(path.normalize(m.primaryFilePath).toLowerCase(), m)
  }

  // Group files by baseGroupKey (combines CD1, CD2, Part 1, Part 2)
  const groups = new Map<string, RawDiscoveredMovieFile[]>()
  for (const item of discovered) {
    const list = groups.get(item.baseGroupKey) || []
    list.push(item)
    groups.set(item.baseGroupKey, list)
  }

  const movies: Movie[] = []

  for (const [_, items] of groups) {
    // Sort items by part number if present
    items.sort((a, b) => (a.partNumber || 1) - (b.partNumber || 1))

    const primary = items[0]
    const filePaths = items.map((i) => i.filePath)
    const normKey = path.normalize(primary.filePath).toLowerCase()
    const existing = existingMap.get(normKey)

    if (existing) {
      movies.push({
        ...existing,
        filePaths,
        primaryFilePath: primary.filePath,
        fileName: primary.fileName,
        cleanTitle: primary.cleanTitle,
        year: primary.year || existing.year
      })
    } else {
      // Extract technical video specs offline
      const specs = await extractTechnicalSpecs(primary.filePath)

      const movie: Movie = {
        id: `movie_${Buffer.from(primary.filePath).toString('base64url').substring(0, 32)}`,
        title: primary.cleanTitle,
        cleanTitle: primary.cleanTitle,
        year: primary.year,
        filePaths,
        primaryFilePath: primary.filePath,
        fileName: primary.fileName,
        fileSize: primary.fileSize,
        durationSec: specs.durationSec,
        timeSec: 0,
        completed: false,
        lastWatchedAt: null,
        resolution: specs.resolution,
        videoCodec: specs.videoCodec,
        audioCodec: specs.audioCodec,
        hasThumbnail: false
      }

      movies.push(movie)
    }
  }

  // Sort movies alphabetically by title
  movies.sort((a, b) => a.cleanTitle.localeCompare(b.cleanTitle, undefined, { sensitivity: 'base' }))

  return movies
}
