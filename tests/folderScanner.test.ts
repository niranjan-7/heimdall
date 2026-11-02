import { describe, expect, it } from 'vitest'
import { cleanEpisodeTitle, extractEpisodeNumber } from '../src/main/folderScanner'
import { episodeCases, episodeKnownBugs } from './fixtures/filenames/episodes'

describe('extractEpisodeNumber', () => {
  for (const c of episodeCases) {
    it(`${c.input} -> ${c.episode}`, () => {
      expect(extractEpisodeNumber(c.input)).toBe(c.episode)
    })
  }
})

describe('cleanEpisodeTitle', () => {
  for (const c of episodeCases.filter((c) => c.title !== undefined)) {
    it(`${c.input} -> ${c.title}`, () => {
      expect(cleanEpisodeTitle(c.input)).toBe(c.title)
    })
  }
})

// Known bugs: these assert the CORRECT behaviour and are expected to fail until fixed.
describe('known parser bugs (roadmap Phase 1.7)', () => {
  for (const c of episodeKnownBugs) {
    it.fails(`${c.input}: ${c.bug}`, () => {
      expect(extractEpisodeNumber(c.input)).toBe(c.episode)
      if (c.title !== undefined) {
        expect(cleanEpisodeTitle(c.input)).toBe(c.title)
      }
    })
  }
})
