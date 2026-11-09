import type { FillerCategory } from '../src/shared/types'
import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { parseShowList } from '../src/main/fillerParser'
import {
  bestShowMatch,
  computeEpisodeOffset,
  createThrottle,
  fillerCacheTtlMs,
  isCacheFresh,
  normalizeTitle,
  prequelEpisodeTotal,
  searchShows,
  slugCandidatesFromTitles,
  stripSeasonMarkers,
  toFillerEpisodeNumber,
  AIRING_CACHE_TTL_MS,
  FINISHED_CACHE_TTL_MS
} from '../src/main/fillerMatcher'

const shows = parseShowList(readFileSync(join(__dirname, 'fixtures/filler/shows.html'), 'utf8'))

describe('slugCandidatesFromTitles', () => {
  it('derives slugs with and without stop words, in title order', () => {
    expect(slugCandidatesFromTitles(['Attack on Titan', 'Shingeki no Kyojin'])).toEqual([
      'attack-titan',
      'attack-on-titan',
      'shingeki-no-kyojin'
    ])
  })

  it('strips accents, punctuation and season markers', () => {
    const slugs = slugCandidatesFromTitles(['Naruto: Shippūden', 'Dr. STONE Season 3'])
    expect(slugs).toContain('naruto-shippuden')
    expect(slugs).toContain('dr-stone')
  })

  it('maps × to x and skips empty titles', () => {
    expect(slugCandidatesFromTitles([null, '', 'HUNTER×HUNTER (2011)'])).toContain(
      'hunter-x-hunter-2011'
    )
  })
})

describe('normalizeTitle / stripSeasonMarkers', () => {
  it('normalises', () => {
    expect(normalizeTitle("JoJo's Bizarre Adventure")).toBe('jojos bizarre adventure')
    expect(normalizeTitle('Michiko & Hatchin')).toBe('michiko and hatchin')
  })
  it('removes season markers', () => {
    expect(stripSeasonMarkers('Shingeki no Kyojin Season 3 Part 2')).toBe('Shingeki no Kyojin')
    expect(stripSeasonMarkers('Boku no Hero Academia 2nd Season')).toBe('Boku no Hero Academia')
    expect(stripSeasonMarkers('Shingeki no Kyojin: The Final Season')).toBe('Shingeki no Kyojin')
  })
})

describe('bestShowMatch against the master show list', () => {
  it('parsed the fixture list', () => {
    expect(shows.length).toBeGreaterThan(300)
  })

  // [AniList titles in the order the app tries them (English, Romaji, synonyms), expected slug]
  const known: Array<[Array<string | null>, string]> = [
    [['Naruto Shippuden', 'Naruto: Shippuuden'], 'naruto-shippuden'],
    [['Naruto', 'NARUTO'], 'naruto'],
    [['ONE PIECE', 'ONE PIECE'], 'one-piece'],
    [['Bleach', 'BLEACH'], 'bleach'],
    [
      ['BLEACH: Thousand-Year Blood War', 'BLEACH: Sennen Kessen-hen'],
      'bleach-thousand-year-blood-war'
    ],
    [['Attack on Titan', 'Shingeki no Kyojin'], 'attack-titan'],
    [['Attack on Titan Season 2', 'Shingeki no Kyojin Season 2'], 'attack-titan'],
    [['My Hero Academia', 'Boku no Hero Academia'], 'my-hero-academia'],
    [['Demon Slayer: Kimetsu no Yaiba', 'Kimetsu no Yaiba'], 'demon-slayer-kimetsu-no-yaiba'],
    [['Hunter x Hunter (2011)', 'HUNTER×HUNTER (2011)'], 'hunter-x-hunter'],
    [['Hunter x Hunter', 'HUNTER×HUNTER'], 'hunter-x-hunter-1999'],
    [
      ['Fullmetal Alchemist: Brotherhood', 'Hagane no Renkinjutsushi: FULLMETAL ALCHEMIST'],
      'fullmetal-alchemist-brotherhood'
    ],
    [['JUJUTSU KAISEN', 'Jujutsu Kaisen'], 'jujutsu-kaisen'],
    [['Black Clover', 'Black Clover'], 'black-clover'],
    [['Fairy Tail', 'FAIRY TAIL'], 'fairy-tail'],
    [['Dragon Ball Z', 'Dragon Ball Z'], 'dragon-ball-z'],
    [['Dragon Ball Z Kai', 'Dragon Ball Kai'], 'dragon-ball-z-kai'],
    [
      ['Boruto: Naruto Next Generations', 'BORUTO: NARUTO NEXT GENERATIONS'],
      'boruto-naruto-next-generations'
    ],
    [['Tokyo Ghoul', 'Tokyo Ghoul'], 'tokyo-ghoul'],
    [['Death Note', 'DEATH NOTE'], 'death-note'],
    [['Sword Art Online', 'Sword Art Online'], 'sword-art-online'],
    [
      ['Kaguya-sama: Love is War', 'Kaguya-sama wa Kokurasetai: Tensai-tachi no Renai Zunousen'],
      'kaguya-sama-love-war'
    ],
    [
      ['That Time I Got Reincarnated as a Slime', 'Tensei shitara Slime Datta Ken'],
      'time-i-got-reincarnated-slime'
    ],
    [['Gintama', 'Gintama'], 'gintama'],
    [['Mob Psycho 100', 'Mob Psycho 100'], 'mob-psycho-100'],
    [['Dr. STONE', 'Dr. STONE'], 'dr-stone'],
    [
      ["JoJo's Bizarre Adventure (2012)", 'JoJo no Kimyou na Bouken (TV)'],
      'jojos-bizarre-adventure-tv'
    ],
    [[null, 'Shokugeki no Souma'], 'shokugeki-no-soma']
  ]

  for (const [titles, slug] of known) {
    it(`${titles.filter(Boolean).join(' / ')} → ${slug}`, () => {
      expect(bestShowMatch(titles, shows)?.slug).toBe(slug)
    })
  }

  it('returns null for a show that is not on the site', () => {
    expect(bestShowMatch(['Frieren: Beyond Journey’s End', 'Sousou no Frieren'], shows)).toBeNull()
  })

  it('searchShows finds by substring', () => {
    const r = searchShows('naruto', shows)
    expect(r.map((s) => s.slug)).toEqual(expect.arrayContaining(['naruto', 'naruto-shippuden']))
  })
})

describe('episode alignment', () => {
  it('sums earlier seasons that share the same filler page', () => {
    expect(
      prequelEpisodeTotal('attack-titan', [
        { slug: 'attack-titan', episodes: 12 },
        { slug: 'attack-titan', episodes: 25 }
      ])
    ).toBe(37)
  })

  it('stops at a prequel on a different page (Naruto → Naruto Shippuden)', () => {
    expect(prequelEpisodeTotal('naruto-shippuden', [{ slug: 'naruto', episodes: 220 }])).toBe(0)
  })

  it('stops when a prequel has no episode count', () => {
    expect(
      prequelEpisodeTotal('x', [
        { slug: 'x', episodes: 10 },
        { slug: 'x', episodes: null },
        { slug: 'x', episodes: 10 }
      ])
    ).toBe(10)
  })

  it('season-relative files get the offset', () => {
    // Attack on Titan S2 files numbered 01–12, Season 1 had 25 episodes.
    expect(computeEpisodeOffset([1, 2, 3, 12], 25)).toBe(25)
    expect(toFillerEpisodeNumber(3, 25)).toBe(28)
  })

  it('absolutely numbered files get no offset', () => {
    // Same season, files numbered 26–37.
    expect(computeEpisodeOffset([26, 27, 37], 25)).toBe(0)
    expect(toFillerEpisodeNumber(26, 0)).toBe(26)
  })

  it('no earlier seasons → no offset', () => {
    expect(computeEpisodeOffset([1047, 1048], 0)).toBe(0)
    expect(computeEpisodeOffset([null, null], 25)).toBe(0)
  })

  it('handles missing numbers', () => {
    expect(toFillerEpisodeNumber(null, 5)).toBeNull()
    expect(toFillerEpisodeNumber(4, -2)).toBe(2)
  })
})

describe('cache policy', () => {
  it('uses 90 days for finished shows and 14 days otherwise', () => {
    expect(fillerCacheTtlMs('FINISHED')).toBe(FINISHED_CACHE_TTL_MS)
    expect(fillerCacheTtlMs('RELEASING')).toBe(AIRING_CACHE_TTL_MS)
    expect(fillerCacheTtlMs(null)).toBe(AIRING_CACHE_TTL_MS)
  })

  it('isCacheFresh', () => {
    const now = 1_000_000_000_000
    const day = 24 * 60 * 60 * 1000
    expect(isCacheFresh(now - 20 * day, 'FINISHED', now)).toBe(true)
    expect(isCacheFresh(now - 20 * day, 'RELEASING', now)).toBe(false)
    expect(isCacheFresh(undefined, 'FINISHED', now)).toBe(false)
  })
})

describe('createThrottle', () => {
  it('spaces calls at least intervalMs apart and keeps going after a failure', async () => {
    let clock = 0
    const sleeps: number[] = []
    const throttle = createThrottle(
      1000,
      () => clock,
      async (ms) => {
        sleeps.push(ms)
        clock += ms
      }
    )
    const starts: number[] = []
    const job =
      (fail = false) =>
      () => {
        starts.push(clock)
        return fail ? Promise.reject(new Error('x')) : Promise.resolve(clock)
      }
    await Promise.all([throttle(job()), throttle(job(true)).catch(() => null), throttle(job())])
    expect(starts).toEqual([0, 1000, 2000])
    expect(sleeps).toEqual([1000, 1000])
  })
})

describe('applyFillerToEpisodes', () => {
  it('applies the offset and clears episodes the page does not cover', async () => {
    const { applyFillerToEpisodes } = await import('../src/main/fillerMatcher')
    const map = new Map([
      [26, { type: 'manga_canon' as const, label: 'Manga Canon', title: 'a' }],
      [27, { type: 'filler' as const, label: 'Filler', title: 'b' }]
    ])
    const eps: Array<{
      episodeNumber: number | null
      fillerType?: FillerCategory
      fillerLabel?: string
    }> = [
      { episodeNumber: 1 },
      { episodeNumber: 2 },
      { episodeNumber: 50, fillerType: 'filler', fillerLabel: 'Filler' },
      { episodeNumber: null }
    ]
    expect(applyFillerToEpisodes(eps, map, 25)).toBe(2)
    expect(eps[1].fillerType).toBe('filler')
    expect(eps[2].fillerType).toBeUndefined()
    expect(applyFillerToEpisodes(eps, null)).toBe(0)
    expect(eps[1].fillerType).toBeUndefined()
  })
})

describe('toFillerMatchInfo (AniList response)', () => {
  it('orders titles English, Romaji, synonyms and picks the TV prequel', async () => {
    const { toFillerMatchInfo } = await import('../src/main/anilistService')
    const info = toFillerMatchInfo({
      id: 20958,
      status: 'FINISHED',
      episodes: 12,
      title: { english: 'Attack on Titan Season 2', romaji: 'Shingeki no Kyojin Season 2' },
      synonyms: ['AoT S2', 'Attack on Titan Season 2'],
      relations: {
        edges: [
          { relationType: 'PREQUEL', node: { id: 1, type: 'ANIME', format: 'MOVIE' } },
          { relationType: 'PREQUEL', node: { id: 16498, type: 'ANIME', format: 'TV' } },
          { relationType: 'SEQUEL', node: { id: 99147, type: 'ANIME', format: 'TV' } }
        ]
      }
    })
    expect(info).toEqual({
      id: 20958,
      status: 'FINISHED',
      episodes: 12,
      titles: ['Attack on Titan Season 2', 'Shingeki no Kyojin Season 2', 'AoT S2'],
      prequelId: 16498
    })
    expect(toFillerMatchInfo(null)).toBeNull()
  })
})
