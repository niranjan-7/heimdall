import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import { join } from 'path'
import {
  chooseSubtitleSource,
  findLocalSubtitleFor,
  findSubtitleFiles,
  isSyncedCopy,
  syncedCopyPath
} from '../src/main/subsync/subtitleSource'
import { mpvPlaylistArgs, vlcPlaylistArgs, vlcSubDelayArg } from '../src/main/player/playlist'

let dir = ''
const touch = (...parts: string[]): string => {
  const p = join(dir, ...parts)
  fs.mkdirSync(join(p, '..'), { recursive: true })
  fs.writeFileSync(p, 'x')
  return p
}

beforeEach(() => {
  dir = fs.mkdtempSync(join(os.tmpdir(), 'heimdall-subs-'))
})
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('finding subtitle files', () => {
  it('only takes files named after this video, plus Subs/ folders', () => {
    const video = touch('Show - 01.mkv')
    const mine = touch('Show - 01.en.srt')
    touch('Show - 02.en.srt') // another episode
    touch('Show - 01.en.heimdall-synced.srt') // our own output
    touch('Show - 01.nfo')
    const nested = touch('Subs', 'Show - 01', '2_English.srt')
    expect(findSubtitleFiles(video).sort()).toEqual([mine, nested].sort())
  })

  it('recognises synced copies', () => {
    expect(isSyncedCopy('/a/Show.en.heimdall-synced.ass')).toBe(true)
    expect(isSyncedCopy('/a/Show.en.srt')).toBe(false)
  })

  it('finds a local subtitle in the wanted language and never another language', () => {
    const video = touch('Film.mkv')
    touch('Film.fr.srt')
    expect(findLocalSubtitleFor(video, 'en')).toBeNull()
    const plain = touch('Film.srt')
    expect(findLocalSubtitleFor(video, 'en')).toBe(plain)
    const eng = touch('Film.eng.ass')
    expect(findLocalSubtitleFor(video, 'en')).toBe(eng)
  })
})

describe('choosing the subtitle to sync', () => {
  it('prefers the playing file, then the last source, then the download, then others', () => {
    const video = touch('Ep.mkv')
    const other = touch('Ep.ja.srt')
    expect(chooseSubtitleSource({ videoPath: video, preferredLang: 'en' })?.path).toBe(other)

    const downloaded = touch('Ep.en.srt')
    expect(chooseSubtitleSource({ videoPath: video, preferredLang: 'en' })).toEqual({
      path: downloaded,
      reason: 'downloaded'
    })

    const previous = touch('Ep.english.ass')
    expect(
      chooseSubtitleSource({ videoPath: video, preferredLang: 'en', previousSource: previous })
        ?.reason
    ).toBe('previous')

    expect(
      chooseSubtitleSource({
        videoPath: video,
        preferredLang: 'en',
        previousSource: previous,
        playingPath: other
      })
    ).toEqual({ path: other, reason: 'playing' })
  })

  it('ignores a playing synced copy and falls back to its source', () => {
    const video = touch('Ep.mkv')
    const source = touch('Ep.en.srt')
    const synced = touch('Ep.en.heimdall-synced.srt')
    expect(
      chooseSubtitleSource({
        videoPath: video,
        preferredLang: 'en',
        playingPath: synced,
        previousSource: source
      })
    ).toEqual({ path: source, reason: 'previous' })
  })

  it('returns null when there is no subtitle file', () => {
    expect(chooseSubtitleSource({ videoPath: touch('Ep.mkv'), preferredLang: 'en' })).toBeNull()
  })

  it('names the synced copy after the video, keeping language and format', () => {
    expect(syncedCopyPath('/m/Ep 1.mkv', '/m/Subs/Ep 1.pt-br.ass', 'en')).toBe(
      join('/m', 'Ep 1.pt-br.heimdall-synced.ass')
    )
    expect(syncedCopyPath('/m/Ep 1.mkv', '/m/Ep 1.srt', 'en')).toBe(
      join('/m', 'Ep 1.en.heimdall-synced.srt')
    )
  })
})

describe('player playlists', () => {
  const entries = [
    { path: '/v/1.mkv', subFile: '/v/1.en.heimdall-synced.srt' },
    { path: '/v/2.mkv' },
    { path: '/v/3.mkv', subFile: '/v/3.en.heimdall-synced.srt' }
  ]

  it('gives mpv per-file start time and subtitles', () => {
    expect(mpvPlaylistArgs(entries, 90.7)).toEqual([
      '--{',
      '--start=90',
      '--sub-file=/v/1.en.heimdall-synced.srt',
      '/v/1.mkv',
      '--}',
      '/v/2.mkv',
      '--{',
      '--sub-file=/v/3.en.heimdall-synced.srt',
      '/v/3.mkv',
      '--}'
    ])
    expect(mpvPlaylistArgs([{ path: '/v/1.mkv' }], 0)).toEqual(['/v/1.mkv'])
  })

  it('gives VLC per-item options', () => {
    expect(vlcPlaylistArgs(entries, 12)).toEqual([
      '/v/1.mkv',
      ':start-time=12',
      ':sub-file=/v/1.en.heimdall-synced.srt',
      '/v/2.mkv',
      '/v/3.mkv',
      ':sub-file=/v/3.en.heimdall-synced.srt'
    ])
  })

  it('passes VLC its sub delay in tenths of a second', () => {
    expect(vlcSubDelayArg(1.5)).toBe('--sub-delay=15')
    expect(vlcSubDelayArg(-0.3)).toBe('--sub-delay=-3')
  })
})
