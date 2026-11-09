import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { decodeHtmlEntities, parseShowList, parseShowPage } from '../src/main/fillerParser'

const fixture = (name: string): string =>
  readFileSync(join(__dirname, 'fixtures/filler', name), 'utf8')

describe('parseShowPage (saved animefillerlist pages)', () => {
  const cases = [
    { file: 'naruto-shippuden.html', total: 500, manga: 232, anime: 1, mixed: 64, filler: 203 },
    { file: 'one-piece.html', total: 1168, manga: 1010, anime: 21, mixed: 43, filler: 94 },
    { file: 'bleach.html', total: 366, manga: 162, anime: 0, mixed: 41, filler: 163 },
    { file: 'attack-titan.html', total: 89, manga: 83, anime: 0, mixed: 6, filler: 0 }
  ]

  for (const c of cases) {
    it(`${c.file}: ${c.total} episodes with the right breakdown`, () => {
      const { episodes, counts } = parseShowPage(fixture(c.file))
      expect(episodes.size).toBe(c.total)
      expect(counts.mangaCanonCount).toBe(c.manga)
      expect(counts.animeCanonCount).toBe(c.anime)
      expect(counts.mixedCanonCount).toBe(c.mixed)
      expect(counts.fillerCount).toBe(c.filler)
      expect(counts.fillerPercentage).toBe(Math.round((c.filler / c.total) * 100))
      expect(episodes.get(1)).toBeDefined()
      expect(episodes.get(c.total)).toBeDefined()
    })
  }

  it('decodes entities in titles and labels types', () => {
    const { episodes } = parseShowPage(fixture('naruto-shippuden.html'))
    expect(episodes.get(1)).toEqual({
      type: 'mixed_canon',
      label: 'Mixed Canon',
      title: 'Homecoming'
    })
    expect(episodes.get(9)?.title).toBe("The Jinchuriki's Tears")
  })

  it('reads four-digit episode numbers', () => {
    const { episodes } = parseShowPage(fixture('one-piece.html'))
    expect(episodes.get(1047)).toBeDefined()
  })

  it('returns no episodes for a page without an episode table', () => {
    const { episodes, counts } = parseShowPage('<html><body><h1>Page not found</h1></body></html>')
    expect(episodes.size).toBe(0)
    expect(counts.fillerPercentage).toBe(0)
  })

  it('tolerates reordered attributes and extra columns', () => {
    const html = `<table><tr id="eps-7" class="filler even"><td class="Number">7</td><td class="Extra">x</td>
      <td class="Title"><a href="/x">Beach &amp; Fun</a></td><td class="Type"><span>Filler</span></td></tr></table>`
    const { episodes } = parseShowPage(html)
    expect(episodes.get(7)).toEqual({ type: 'filler', label: 'Filler', title: 'Beach & Fun' })
  })
})

describe('parseShowList', () => {
  const list = parseShowList(fixture('shows.html'))

  it('reads every show once with decoded titles', () => {
    expect(list.length).toBeGreaterThan(300)
    expect(new Set(list.map((s) => s.slug)).size).toBe(list.length)
    expect(list).toContainEqual({ slug: 'one-piece', title: 'One Piece' })
    expect(list).toContainEqual({
      slug: 'jojos-bizarre-adventure-tv',
      title: "JoJo's Bizarre Adventure"
    })
    expect(list.some((s) => s.slug === 'latest-updates')).toBe(false)
  })
})

describe('decodeHtmlEntities', () => {
  it('handles named, decimal and hex entities', () => {
    expect(decodeHtmlEntities('a &amp; b &#039;c&#x27; &quot;d&quot; &unknown;')).toBe(
      `a & b 'c' "d" &unknown;`
    )
  })
})
