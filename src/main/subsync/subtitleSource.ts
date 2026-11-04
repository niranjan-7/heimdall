import * as fs from 'fs'
import * as path from 'path'
import { formatFromPath } from './subtitleFormat'

/** Marker in the names of files Heimdall writes; they are never used as a source. */
export const SYNCED_MARKER = '.heimdall-synced.'

export function isSyncedCopy(filePath: string): boolean {
  return path.basename(filePath).toLowerCase().includes(SYNCED_MARKER)
}

/** Text subtitle files that belong to a video: next to it, or in a Subs/ folder beside it. */
export function findSubtitleFiles(videoPath: string): string[] {
  const dir = path.dirname(videoPath)
  const base = path.basename(videoPath, path.extname(videoPath)).toLowerCase()
  const found: string[] = []

  const scan = (folder: string, requireBase: boolean): void => {
    let names: string[] = []
    try {
      names = fs.readdirSync(folder)
    } catch {
      return
    }
    for (const name of names) {
      const full = path.join(folder, name)
      if (!formatFromPath(name) || isSyncedCopy(name)) continue
      if (requireBase && !name.toLowerCase().startsWith(base + '.')) continue
      found.push(full)
    }
  }

  scan(dir, true)
  for (const sub of ['Subs', 'subs', 'Subtitles', 'subtitles']) {
    const folder = path.join(dir, sub)
    scan(folder, true)
    // Release folders often keep one subtitle per episode in a folder named after the video.
    scan(path.join(folder, path.basename(videoPath, path.extname(videoPath))), false)
  }
  // On case-insensitive disks "Subs" and "subs" are the same folder: keep each file once.
  const seen = new Set<string>()
  return found.filter((p) => {
    let key = p
    try {
      key = fs.realpathSync.native(p)
    } catch {
      // keep the path as found
    }
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Language tags such as "en", "eng", "en-US" in "<video>.<lang>.srt". */
function languageOf(videoPath: string, subPath: string): string | null {
  const base = path.basename(videoPath, path.extname(videoPath)).toLowerCase()
  const name = path.basename(subPath).toLowerCase()
  const middle = name.startsWith(base + '.') ? name.slice(base.length + 1) : name
  const tags = middle.split('.').slice(0, -1)
  const tag = tags.find((t) => /^[a-z]{2,3}(-[a-z]{2,4})?$/.test(t))
  return tag ?? null
}

/** Single-word names a language goes by in subtitle file names ("Show.E01.eng.srt", "2_English.srt"). */
const LANG_ALIASES: Record<string, string[]> = {
  en: ['en', 'eng', 'english', 'sdh'],
  es: ['es', 'esp', 'spa', 'spanish', 'espanol'],
  fr: ['fr', 'fre', 'fra', 'french', 'francais'],
  de: ['de', 'ger', 'deu', 'german', 'deutsch'],
  ja: ['ja', 'jpn', 'japanese', 'nihongo'],
  ko: ['ko', 'kor', 'korean'],
  zh: ['zh', 'chi', 'zho', 'chinese', 'chs', 'cht'],
  it: ['it', 'ita', 'italian', 'italiano'],
  pt: ['pt', 'por', 'portuguese', 'portugues'],
  hi: ['hi', 'hin', 'hindi'],
  ar: ['ar', 'ara', 'arabic']
}

function matchesLanguage(subPath: string, lang: string): boolean {
  const tokens = path
    .basename(subPath)
    .toLowerCase()
    .split(/[.\s_-]+/)
  const aliases = LANG_ALIASES[lang] ?? [lang]
  return tokens.some((t) => aliases.includes(t))
}

export interface SourceChoice {
  path: string
  /** Why it was picked, for the result message. */
  reason: 'playing' | 'previous' | 'downloaded' | 'nearby'
}

/**
 * Which subtitle to sync, in order:
 * 1. the external file the player is showing right now (a synced copy maps back to its source),
 * 2. the source used for the last sync,
 * 3. the file Heimdall downloaded (`<video>.<lang>.srt`),
 * 4. other files next to the video: preferred language first, then the plain `<video>.srt`.
 * Embedded tracks are never picked here.
 */
export function chooseSubtitleSource(opts: {
  videoPath: string
  preferredLang: string
  playingPath?: string | null
  previousSource?: string | null
}): SourceChoice | null {
  const exists = (p?: string | null): p is string => !!p && fs.existsSync(p)

  if (exists(opts.playingPath) && !isSyncedCopy(opts.playingPath)) {
    return { path: opts.playingPath, reason: 'playing' }
  }
  if (exists(opts.previousSource)) return { path: opts.previousSource, reason: 'previous' }

  const dir = path.dirname(opts.videoPath)
  const base = path.basename(opts.videoPath, path.extname(opts.videoPath))
  const downloaded = path.join(dir, `${base}.${opts.preferredLang}.srt`)
  if (exists(downloaded)) return { path: downloaded, reason: 'downloaded' }

  const files = findSubtitleFiles(opts.videoPath)
  const rank = (p: string): number => {
    if (matchesLanguage(p, opts.preferredLang)) return 0
    if (languageOf(opts.videoPath, p) === null) return 1
    return 2
  }
  files.sort((a, b) => rank(a) - rank(b) || a.length - b.length)
  return files.length ? { path: files[0], reason: 'nearby' } : null
}

/** Name for the retimed copy: `<video>.<lang>.heimdall-synced.<ext>` next to the video. */
export function syncedCopyPath(
  videoPath: string,
  sourcePath: string,
  fallbackLang: string
): string {
  const dir = path.dirname(videoPath)
  const base = path.basename(videoPath, path.extname(videoPath))
  const lang = languageOf(videoPath, sourcePath) ?? fallbackLang
  const ext = path.extname(sourcePath).slice(1).toLowerCase()
  return path.join(dir, `${base}.${lang}${SYNCED_MARKER}${ext}`)
}

/**
 * A subtitle file for this video in the wanted language, or one with no language in its name.
 * Never returns another language or one of Heimdall's synced copies.
 */
export function findLocalSubtitleFor(videoPath: string, lang: string): string | null {
  const files = findSubtitleFiles(videoPath).filter(
    (p) => matchesLanguage(p, lang) || languageOf(videoPath, p) === null
  )
  files.sort(
    (a, b) =>
      Number(!matchesLanguage(a, lang)) - Number(!matchesLanguage(b, lang)) || a.length - b.length
  )
  return files[0] ?? null
}
