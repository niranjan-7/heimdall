import { describe, expect, it } from 'vitest'
import { getBundledBinary } from '../src/main/binaries'
import { runAlass } from '../src/main/subsync/alassAligner'
import { findBestTiming } from '../src/main/subsync/engine'
import { Cue } from '../src/main/subsync/subtitleFormat'
import { invert, makeCues, makeSpeech } from './helpers/syncFixtures'

/**
 * The real alass on synthetic speech. Runs in CI (where alass is downloaded, or built on macOS);
 * set HEIMDALL_ALASS_TESTS=1 and run `npm run binaries` (macOS: node scripts/build-alass.mjs
 * --host) to run it locally.
 */
const enabled = process.env.HEIMDALL_ALASS_TESTS === '1'

const MINUTES = 24
const truth = makeCues(MINUTES, 7)
const speech = makeSpeech(truth, MINUTES, 11)

/** Largest error, in seconds, between where the cues land and where they belong. */
function maxError(cues: Cue[]): number {
  return Math.max(...cues.map((c, i) => Math.abs(c.start - truth[i].start)))
}

describe.runIf(enabled)('real alass', () => {
  const binary = getBundledBinary('alass-cli')

  it('is bundled for this platform', () => {
    expect(binary).not.toBeNull()
  })

  // Positive offsets move the subtitle earlier, so keep them small enough that no line goes below 0.
  it.each([3.4, -42, -95])(
    'recovers a shift of %s s as one section',
    async (shift) => {
      const broken = invert(truth, { offset: shift, scale: 1 })
      const r = await runAlass(binary as string, speech, broken)
      expect(r.segments).toBe(1)
      expect(maxError(r.cues)).toBeLessThanOrEqual(0.4)
    },
    60_000
  )

  it('recovers subtitles timed for 25 fps on a 23.976 fps video', async () => {
    const broken = invert(truth, { offset: 0.8, scale: 25 / 23.976 })
    const r = await runAlass(binary as string, speech, broken)
    expect(maxError(r.cues)).toBeLessThanOrEqual(0.5)
    expect(r.fpsChange).toBe('25 → 23.976 fps')
  }, 60_000)

  it('finds a cut as separate sections', async () => {
    // The first part of the subtitle is 2 s early, the rest 92 s early (a 90 s block was cut). The
    // second part then overlaps the first in time, so alass has to cope with lines out of order.
    const half = Math.floor(truth.length / 2)
    const broken = truth.map((c, i) => {
      const d = i < half ? 2 : 92
      return { start: c.start - d, end: c.end - d }
    })
    const r = await runAlass(binary as string, speech, broken)
    expect(r.segments).toBeGreaterThanOrEqual(2)
    expect(r.segments).toBeLessThanOrEqual(3)
    expect(maxError(r.cues)).toBeLessThanOrEqual(0.5)
  }, 60_000)

  it('end to end: applies a confident result and refuses another episode', async () => {
    const runWith = (cues: Cue[]) =>
      findBestTiming({
        speech,
        cues,
        runAlass: () => runAlass(binary as string, speech, cues)
      })

    const good = await runWith(invert(truth, { offset: 12, scale: 1 }))
    expect(good.alassError).toBeUndefined()
    expect(good.best.verdict.confidence).toBe('high')

    const wrong = await runWith(makeCues(MINUTES, 99))
    expect(wrong.best.verdict.confidence).not.toBe('high')
  }, 120_000)
})
