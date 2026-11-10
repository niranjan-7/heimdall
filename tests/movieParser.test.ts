import { describe, expect, it } from 'vitest'
import { parseMovieFileName } from '../src/main/movieParser'
import { movieCases, movieKnownBugs } from './fixtures/filenames/movies'

describe('parseMovieFileName', () => {
  for (const c of movieCases) {
    it(c.input, () => {
      const parsed = parseMovieFileName(c.input)
      expect(parsed.cleanTitle).toBe(c.cleanTitle)
      expect(parsed.year).toBe(c.year)
      expect(parsed.partNumber).toBe(c.partNumber)
    })
  }

  it('gives all parts of a multi-part film the same group key', () => {
    const cd1 = parseMovieFileName('Movie Name - CD1.avi')
    const cd2 = parseMovieFileName('Movie Name - CD2.avi')
    expect(cd1.baseGroupKey).toBe(cd2.baseGroupKey)
  })

  it('separates films with the same title but different years', () => {
    const a = parseMovieFileName('Dune.1984.mkv')
    const b = parseMovieFileName('Dune.2021.mkv')
    expect(a.baseGroupKey).not.toBe(b.baseGroupKey)
  })

  it('falls back to the raw name when nothing is left after cleaning', () => {
    expect(parseMovieFileName('1080p.mkv').cleanTitle).toBe('1080p')
  })
})

// Known bugs: assert the CORRECT behaviour and are expected to fail until fixed.
// Add a row to the known-bugs list when you find one, then fix it and move the row up.
describe.runIf(movieKnownBugs.length > 0)('known parser bugs', () => {
  for (const c of movieKnownBugs) {
    it.fails(`${c.input}: ${c.bug}`, () => {
      const parsed = parseMovieFileName(c.input)
      expect(parsed.cleanTitle).toBe(c.cleanTitle)
      expect(parsed.year).toBe(c.year)
      expect(parsed.partNumber).toBe(c.partNumber)
    })
  }
})
