import * as path from 'path'
import { spawn } from 'child_process'
import { getBinaryPath } from './binaries'

export interface ParsedMovieInfo {
  cleanTitle: string
  year: number | null
  partNumber: number | null
  baseGroupKey: string
}

export interface MovieTechnicalSpecs {
  resolution?: string
  videoCodec?: string
  audioCodec?: string
  durationSec: number
}

const MOVIE_TAGS =
  /\b(?:2160p|1440p|1080p|1080i|720p|576p|480p|4k|uhd|bluray|blu-ray|bdrip|brrip|bdremux|web-?dl|web-?rip|web|hdtv|hdrip|dvdrip|dvdscr|hdcam|camrip|hdts|telesync|hdtc|remux|imax|hdr10\+?|hdr|dv|10bit|8bit|x264|x265|h[ .]?264|h[ .]?265|hevc|avc|av1|xvid|aac(?:2[ .]0|5[ .]1)?|e?ac3|dts(?:-hd)?(?:[ .]ma)?|truehd|atmos|ddp?(?:2[ .]0|5[ .]1|7[ .]1)?|flac|extended|unrated|directors[ .]cut|theatrical|remastered|proper|repack|limited|internal|multi|dual[ -]?audio)\b/gi

/** Latest plausible release year (titles like "Blade Runner 2049" are not years). */
const maxReleaseYear = (): number => new Date().getFullYear() + 1

export function parseMovieFileName(fileName: string): ParsedMovieInfo {
  const parsed = path.parse(fileName)
  let rawName = parsed.name

  // 1. Multi-part indicators (CD1, Part 2, Part.1, pt2, Disc 1). Cut out, keep the rest.
  let partNumber: number | null = null
  const partMatch = /(?:[-._\s]+)(?:cd|part|pt|disc|disk)[\s._-]*0?([1-9])(?![0-9])/i.exec(rawName)
  if (partMatch) {
    partNumber = parseInt(partMatch[1], 10)
    rawName =
      rawName.slice(0, partMatch.index) + ' ' + rawName.slice(partMatch.index + partMatch[0].length)
  }

  // 2. Release year: prefer "(1999)", else the LAST plausible year-like number
  //    that is not at the very start ("2001 A Space Odyssey 1968", "Blade Runner 2049 2017").
  let year: number | null = null
  let titleSegment = rawName
  const maxYear = maxReleaseYear()
  const plausible = (y: number): boolean => y >= 1888 && y <= maxYear
  const paren = [...rawName.matchAll(/[([]((?:19|20)\d\d)[)\]]/g)].filter((m) =>
    plausible(parseInt(m[1], 10))
  )
  const bare = [...rawName.matchAll(/(?<=[.\s_-])((?:19|20)\d\d)(?=[.\s_)\]-]|$)/g)].filter((m) =>
    plausible(parseInt(m[1], 10))
  )
  const yearMatch =
    paren.length > 0 ? paren[paren.length - 1] : bare.length > 0 ? bare[bare.length - 1] : null
  if (yearMatch && yearMatch.index !== undefined) {
    year = parseInt(yearMatch[1], 10)
    titleSegment = rawName.substring(0, yearMatch.index)
  }

  // 3. Clean title segment. Without a year, everything from the first tag on is junk.
  if (!yearMatch) {
    MOVIE_TAGS.lastIndex = 0
    const firstTag = MOVIE_TAGS.exec(titleSegment.replace(/[._]/g, ' '))
    if (firstTag && firstTag.index > 0) titleSegment = titleSegment.slice(0, firstTag.index)
  }
  MOVIE_TAGS.lastIndex = 0
  let cleanTitle = titleSegment
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, (m) => {
      MOVIE_TAGS.lastIndex = 0
      return MOVIE_TAGS.test(m) ? ' ' : m
    })
    .replace(/[._]/g, ' ')
    .replace(MOVIE_TAGS, ' ')
    .replace(/\(\s*\)/g, ' ')
    .replace(/[\s\-_(]+$/, '') // trailing dashes, underscores, spaces, open parens
    .replace(/^\s*[-_]+/, '') // leading dashes
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleanTitle) {
    cleanTitle = parsed.name
  }

  const baseGroupKey = `${cleanTitle.toLowerCase()}_${year || 'noyear'}`

  return {
    cleanTitle,
    year,
    partNumber,
    baseGroupKey
  }
}

export async function extractTechnicalSpecs(filePath: string): Promise<MovieTechnicalSpecs> {
  return new Promise((resolve) => {
    try {
      const child = spawn(getBinaryPath('ffmpeg'), ['-i', filePath], {
        stdio: ['ignore', 'ignore', 'pipe'],
        windowsHide: true
      })

      let stderrData = ''
      child.stderr.on('data', (d) => {
        stderrData += d.toString()
      })

      child.on('close', () => {
        let resolution: string | undefined
        let videoCodec: string | undefined
        let audioCodec: string | undefined
        let durationSec = 0

        const durMatch = /Duration:\s*(\d{2}):(\d{2}):(\d{2})/i.exec(stderrData)
        if (durMatch) {
          durationSec =
            parseInt(durMatch[1], 10) * 3600 +
            parseInt(durMatch[2], 10) * 60 +
            parseInt(durMatch[3], 10)
        }

        const resMatch = /Stream #.*Video:.*,\s*(\d{3,4})x(\d{3,4})/i.exec(stderrData)
        if (resMatch) {
          const width = parseInt(resMatch[1], 10)
          if (width >= 3800) resolution = '4K UHD'
          else if (width >= 1900) resolution = '1080p'
          else if (width >= 1200) resolution = '720p'
          else resolution = 'SD'
        }

        const vcodecMatch = /Stream #.*Video:\s*([a-zA-Z0-9_-]+)/i.exec(stderrData)
        if (vcodecMatch) {
          const rawCodec = vcodecMatch[1].toLowerCase()
          if (rawCodec.includes('hevc') || rawCodec.includes('h265')) videoCodec = 'HEVC'
          else if (rawCodec.includes('h264')) videoCodec = 'H.264'
          else if (rawCodec.includes('av1')) videoCodec = 'AV1'
          else videoCodec = vcodecMatch[1].toUpperCase()
        }

        const acodecMatch =
          /Stream #.*Audio:\s*([a-zA-Z0-9_-]+)(?:.*,\s*(5\.1|7\.1|stereo|mono))?/i.exec(stderrData)
        if (acodecMatch) {
          const codec = acodecMatch[1].toUpperCase()
          const channels = acodecMatch[2] ? ` ${acodecMatch[2]}` : ''
          audioCodec = `${codec}${channels}`
        }

        resolve({
          resolution,
          videoCodec,
          audioCodec,
          durationSec
        })
      })

      child.on('error', () => {
        resolve({ durationSec: 0 })
      })
    } catch {
      resolve({ durationSec: 0 })
    }
  })
}
