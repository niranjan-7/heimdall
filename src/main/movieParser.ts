import * as path from 'path'
import { spawn } from 'child_process'

// @ts-ignore
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

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

const ffmpegPath = ffmpegInstaller.path || 'ffmpeg'

export function parseMovieFileName(fileName: string): ParsedMovieInfo {
  const parsed = path.parse(fileName)
  let rawName = parsed.name

  // 1. Detect multi-part indicators (e.g. CD1, Part 2, Disc 1)
  let partNumber: number | null = null
  const partMatch = /(?:[-._\s]+)(?:cd|part|pt|disc)\s*0?([1-9])\b/i.exec(rawName)
  if (partMatch) {
    partNumber = parseInt(partMatch[1], 10)
    rawName = rawName.substring(0, partMatch.index)
  }

  // 2. Detect release year (e.g. 1999, 2023)
  let year: number | null = null
  const yearMatch = /(?:[.\s_(\[])(19\d\d|20\d\d)(?:[.\s_)\]]|$)/.exec(rawName)
  let titleSegment = rawName
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10)
    titleSegment = rawName.substring(0, yearMatch.index)
  }

  // 3. Clean title segment
  let cleanTitle = titleSegment
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*(?:1080p|720p|480p|2160p|4k|uhd|bluray|remux|x264|x265|hevc)[^)]*\)/gi, ' ')
    .replace(
      /\b(?:2160p|1080p|720p|480p|4k|uhd|bluray|bdrip|web-dl|webrip|web|remux|imax|hdr|10bit|x264|x265|hevc|av1|aac|dts|dts-hd|truehd|atmos|ddp|flac)\b/gi,
      ' '
    )
    .replace(/[._]/g, ' ')
    .replace(/[\s\-_]+$/, '') // strip trailing dashes, underscores, spaces
    .replace(/^\s*[\-_]+/, '') // strip leading dashes
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
      const child = spawn(ffmpegPath, ['-i', filePath], {
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
