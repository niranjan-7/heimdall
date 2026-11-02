import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { scanSeriesFolders } from '../src/main/folderScanner'
import type { Episode } from '../src/shared/types'

let root: string

function touch(...segments: string[]): string {
  const file = path.join(root, ...segments)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, '')
  return file
}

function existingEpisode(filePath: string, overrides: Partial<Episode> = {}): Episode {
  return {
    id: 'ep_existing',
    filePath,
    fileName: path.basename(filePath),
    title: 'Episode 1',
    seasonName: 'All Episodes',
    seasonFolder: 'Season 1',
    episodeNumber: 1,
    timeSec: 0,
    durationSec: 0,
    completed: false,
    lastWatchedAt: null,
    ...overrides
  }
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'heimdall-scan-'))
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

describe('scanSeriesFolders', () => {
  it('derives the series title from the folder name', () => {
    const showRoot = path.join(root, 'Sousou_no.Frieren')
    fs.mkdirSync(showRoot)
    expect(scanSeriesFolders(showRoot).title).toBe('Sousou no Frieren')
  })

  it('orders episodes numerically, not alphabetically', () => {
    touch('Show - 10.mkv')
    touch('Show - 2.mkv')
    touch('Show - 1.mkv')

    const { episodes } = scanSeriesFolders(root)
    expect(episodes.map((e) => e.episodeNumber)).toEqual([1, 2, 10])
  })

  it('uses one "All Episodes" season when there are no subfolders', () => {
    touch('Show - 01.mkv')
    touch('Show - 02.mkv')

    const { episodes } = scanSeriesFolders(root)
    expect(episodes.every((e) => e.seasonName === 'All Episodes')).toBe(true)
  })

  it('names seasons after their subfolders', () => {
    touch('Season 1', 'Show - 01.mkv')
    touch('Season 2', 'Show - 01.mkv')

    const { episodes } = scanSeriesFolders(root)
    expect(new Set(episodes.map((e) => e.seasonName))).toEqual(new Set(['Season 1', 'Season 2']))
  })

  it('ignores non-video files and hidden folders', () => {
    touch('Show - 01.mkv')
    touch('Show - 01.srt')
    touch('notes.txt')
    touch('.hidden', 'Show - 99.mkv')

    const { episodes } = scanSeriesFolders(root)
    expect(episodes.map((e) => e.fileName)).toEqual(['Show - 01.mkv'])
  })

  it('keeps watch progress for files it has seen before', () => {
    const file = touch('Show - 01.mkv')
    const previous = existingEpisode(file, { timeSec: 120, durationSec: 1400, lastWatchedAt: 1 })

    const { episodes } = scanSeriesFolders(root, [], [previous])
    expect(episodes).toHaveLength(1)
    expect(episodes[0]).toMatchObject({ id: 'ep_existing', timeSec: 120, durationSec: 1400 })
  })

  it('keeps a completed episode whose file was deleted, marked as missing', () => {
    touch('Show - 02.mkv')
    const gone = existingEpisode(path.join(root, 'Show - 01.mkv'), {
      completed: true,
      timeSec: 1400
    })

    const { episodes } = scanSeriesFolders(root, [], [gone])
    const kept = episodes.find((e) => e.id === 'ep_existing')
    expect(kept).toMatchObject({ completed: true, fileMissing: true })
  })

  it('drops an unfinished episode whose file was deleted', () => {
    touch('Show - 02.mkv')
    const gone = existingEpisode(path.join(root, 'Show - 01.mkv'), { completed: false })

    const { episodes } = scanSeriesFolders(root, [], [gone])
    expect(episodes.some((e) => e.id === 'ep_existing')).toBe(false)
  })

  it('scans additional season folders', () => {
    const extra = path.join(root, 'elsewhere', 'Season 2')
    fs.mkdirSync(extra, { recursive: true })
    fs.writeFileSync(path.join(extra, 'Show - 01.mkv'), '')
    const showRoot = path.join(root, 'Show')
    fs.mkdirSync(showRoot)
    fs.writeFileSync(path.join(showRoot, 'Show - 01.mkv'), '')

    const { episodes } = scanSeriesFolders(showRoot, [extra])
    expect(episodes).toHaveLength(2)
  })

  it('returns no episodes for a missing folder', () => {
    const { episodes } = scanSeriesFolders(path.join(root, 'does-not-exist'))
    expect(episodes).toEqual([])
  })
})
