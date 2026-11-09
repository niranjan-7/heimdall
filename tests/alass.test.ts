import { describe, expect, it } from 'vitest'
import { join } from 'path'
import { FRAME_SEC } from '../src/main/subsync/speechEnvelope'
import {
  AlassResult,
  runAlass,
  speechToCues,
  summarizeShift
} from '../src/main/subsync/alassAligner'
import { findBestTiming, timedCues } from '../src/main/subsync/engine'
import { capBySections } from '../src/main/subsync/verifier'
import {
  Cue,
  cuesToSrt,
  parseLabeledSrt,
  parseCues,
  retimeSubtitle,
  retimeSubtitleCues
} from '../src/main/subsync/subtitleFormat'
import { invert, makeCues, makeSpeech } from './helpers/syncFixtures'

const FAKE = { file: process.execPath, args: [join(__dirname, 'helpers', 'fakeAlass.cjs')] }

// --- Pieces ----------------------------------------------------------------------------------

describe('speech as a reference subtitle', () => {
  it('turns runs of speech into cues and bridges short gaps', () => {
    const speech = new Uint8Array(1000)
    speech.fill(1, 100, 200) // 1.00-2.00 s
    speech.fill(1, 210, 300) // 2.10-3.00 s, 0.1 s after the first: joined
    speech.fill(1, 500, 560) // 5.00-5.60 s, far away: separate
    expect(speechToCues(speech)).toEqual([
      { start: 1, end: 3 },
      { start: 5, end: 5.6 }
    ])
    expect(FRAME_SEC).toBe(0.01)
  })

  it('handles speech that runs to the end of the audio', () => {
    const speech = new Uint8Array(100)
    speech.fill(1, 90, 100)
    expect(speechToCues(speech)).toEqual([{ start: 0.9, end: 1 }])
  })
})

describe('summarising how alass moved the lines', () => {
  const lines = (n: number, gap = 10): Cue[] =>
    Array.from({ length: n }, (_, i) => ({ start: i * gap, end: i * gap + 3 }))
  const moved = (cues: Cue[], f: (c: Cue, i: number) => number): Cue[] =>
    cues.map((c, i) => ({ start: c.start + f(c, i), end: c.end + f(c, i) }))

  it('reports one section for a plain shift', () => {
    const cues = lines(40)
    const s = summarizeShift(
      cues,
      moved(cues, () => -2.5)
    )
    expect(s).toMatchObject({ segments: 1, offsetSec: -2.5, scale: 1 })
    expect(s.fpsChange).toBeUndefined()
  })

  it('finds a cut as two sections and reports the bigger one', () => {
    const cues = lines(40)
    const s = summarizeShift(
      cues,
      moved(cues, (_c, i) => (i < 30 ? 1 : 91))
    )
    expect(s.segments).toBe(2)
    expect(s.offsetSec).toBe(1)
  })

  it('names a frame-rate correction', () => {
    const cues = lines(60)
    const ratio = 23.976 / 25
    const aligned = cues.map((c) => ({ start: c.start * ratio + 1, end: c.end * ratio + 1 }))
    const s = summarizeShift(cues, aligned)
    expect(s.segments).toBe(1)
    expect(s.fpsChange).toBe('23.976 → 25 fps')
    expect(s.scale).toBeCloseTo(ratio, 3)
  })

  it('does not call a tiny drift a frame-rate change', () => {
    const cues = lines(60)
    const aligned = cues.map((c) => ({ start: c.start * 1.0001, end: c.end * 1.0001 }))
    expect(summarizeShift(cues, aligned).scale).toBe(1)
  })
})

describe('giving each cue its own time', () => {
  const SRT = '1\n00:00:01,000 --> 00:00:02,000\nA\n\n2\n00:00:05,000 --> 00:00:06,000\nB\n'
  const ASS = [
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    'Dialogue: 0,0:00:05.00,0:00:06.00,Default,,0,0,0,,Second in time, first in file',
    'Comment: 0,0:00:00.00,0:00:01.00,Default,,0,0,0,,note',
    'Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,{\\i1}Early{\\i0}'
  ].join('\n')

  it('keeps file order when asked, and sorts by default', () => {
    expect(parseCues(ASS, 'ass', { fileOrder: true }).map((c) => c.start)).toEqual([5, 1])
    expect(parseCues(ASS, 'ass').map((c) => c.start)).toEqual([1, 5])
  })

  it('retimes SRT lines one by one', () => {
    const out = retimeSubtitleCues(SRT, 'srt', [
      { start: 11, end: 12 },
      { start: 105, end: 106.5 }
    ])
    expect(out).toContain('00:00:11,000 --> 00:00:12,000\nA')
    expect(out).toContain('00:01:45,000 --> 00:01:46,500\nB')
  })

  it('retimes ASS lines in file order and leaves other lines alone', () => {
    const out = retimeSubtitleCues(ASS, 'ass', [
      { start: 15, end: 16 },
      { start: 2, end: 3 }
    ])
    expect(out).toContain('Dialogue: 0,0:00:15.00,0:00:16.00,Default,,0,0,0,,Second in time')
    expect(out).toContain('Dialogue: 0,0:00:02.00,0:00:03.00,Default,,0,0,0,,{\\i1}Early{\\i0}')
    expect(out).toContain('Comment: 0,0:00:00.00,0:00:01.00')
  })

  it('refuses a list of the wrong length', () => {
    expect(() => retimeSubtitleCues(SRT, 'srt', [{ start: 1, end: 2 }])).toThrow(/Expected 2/)
  })

  it('gives the same result as one shift when every cue moves alike', () => {
    const cues = parseCues(SRT, 'srt', { fileOrder: true })
    const shifted = cues.map((c) => ({ start: c.start + 3, end: c.end + 3 }))
    expect(retimeSubtitleCues(SRT, 'srt', shifted)).toBe(
      retimeSubtitle(SRT, 'srt', { offset: 3, scale: 1 })
    )
  })

  it('labels cues and reads the labels back, in written order', () => {
    const cues = [
      { start: 1, end: 2 },
      { start: 5, end: 6 }
    ]
    const srt = cuesToSrt(cues, (i) => `L${i}`)
    expect(parseLabeledSrt(srt)).toEqual([
      { label: 'L0', start: 1, end: 2 },
      { label: 'L1', start: 5, end: 6 }
    ])
  })

  it('writes a minimal SRT that reads back the same', () => {
    const cues = [
      { start: 1.5, end: 2.25 },
      { start: 3600, end: 3601 }
    ]
    expect(parseCues(cuesToSrt(cues), 'srt', { fileOrder: true })).toEqual(cues)
  })
})

describe('capping confidence by sections', () => {
  it('trusts one to three sections, asks for four to six, refuses more', () => {
    expect(capBySections('high', 1)).toBe('high')
    expect(capBySections('high', 3)).toBe('high')
    expect(capBySections('high', 4)).toBe('medium')
    expect(capBySections('medium', 6)).toBe('medium')
    expect(capBySections('high', 7)).toBe('low')
  })
})

// --- Choosing between alass and the built-in aligner ------------------------------------------

const MINUTES = 24
const truth = makeCues(MINUTES, 7)
const speech = makeSpeech(truth, MINUTES, 11)

const perfect = (broken: Cue[], sections = 1): AlassResult => ({
  cues: truth.slice(0, broken.length),
  segments: sections,
  offsetSec: 0,
  scale: 1
})

describe('picking the best timing', () => {
  it('uses alass and skips the built-in aligner when alass is confident', async () => {
    const broken = invert(truth, { offset: 12, scale: 1 })
    const r = await findBestTiming({
      speech,
      cues: broken,
      runAlass: async () => perfect(broken)
    })
    expect(r.best.engine).toBe('alass')
    expect(r.best.verdict.confidence).toBe('high')
    expect(r.tried).toHaveLength(1)
  })

  it('falls back to the built-in aligner when alass fails', async () => {
    const broken = invert(truth, { offset: 12, scale: 1 })
    const r = await findBestTiming({
      speech,
      cues: broken,
      runAlass: async () => {
        throw new Error('alass exited with code 3')
      }
    })
    expect(r.best.engine).toBe('native')
    expect(r.best.verdict.confidence).toBe('high')
    expect(r.alassError).toMatch(/code 3/)
  })

  it('works without alass', async () => {
    const broken = invert(truth, { offset: -7, scale: 1 })
    const r = await findBestTiming({ speech, cues: broken })
    expect(r.best.engine).toBe('native')
    expect(r.alassError).toBeUndefined()
  })

  it('does not hide a cancel', async () => {
    await expect(
      findBestTiming({
        speech,
        cues: truth,
        runAlass: async () => {
          throw new Error('cancelled')
        }
      })
    ).rejects.toThrow('cancelled')
  })

  it('does not trust a result that needed many sections', async () => {
    const broken = invert(truth, { offset: 12, scale: 1 })
    const r = await findBestTiming({
      speech,
      cues: broken,
      runAlass: async () => perfect(broken, 9)
    })
    // Same perfect timing, but nine sections: alass is capped to "refuse", so the built-in
    // aligner's confident single shift wins.
    expect(r.tried[0].verdict.confidence).toBe('low')
    expect(r.best.engine).toBe('native')
  })

  it('says subtitles that are already right are in sync, without a second opinion', async () => {
    const r = await findBestTiming({
      speech,
      cues: truth,
      runAlass: async () => ({ cues: truth, segments: 1, offsetSec: 0, scale: 1 })
    })
    expect(r.best.verdict.alreadyInSync).toBe(true)
    expect(r.tried).toHaveLength(1)
  })

  it('refuses a subtitle for another episode even if alass splits it into pieces', async () => {
    const other = makeCues(MINUTES, 99)
    const r = await findBestTiming({
      speech,
      cues: other,
      // alass chopped the foreign subtitle into 12 pieces to chase the speech
      runAlass: async () => ({ cues: other, segments: 12, offsetSec: 3, scale: 1 })
    })
    expect(r.best.verdict.confidence).toBe('low')
  })

  it('returns times in the order of the cues for either kind of timing', () => {
    const cues = [{ start: 10, end: 12 }]
    expect(timedCues(cues, { kind: 'cues', cues: [{ start: 1, end: 2 }] })).toEqual([
      { start: 1, end: 2 }
    ])
    expect(timedCues(cues, { kind: 'transform', transform: { offset: -4, scale: 1 } })).toEqual([
      { start: 6, end: 8 }
    ])
  })
})

// --- Running the program ---------------------------------------------------------------------

describe('running alass', () => {
  const cues = truth.slice(0, 40)
  const withMode = async (mode: string, extra: object = {}): Promise<AlassResult> => {
    process.env.FAKE_ALASS = mode
    try {
      return await runAlass('unused', speech, cues, { launcher: FAKE, ...extra })
    } finally {
      delete process.env.FAKE_ALASS
    }
  }

  it('passes the files and reads the new times back in order', async () => {
    const r = await withMode('shift:-2.5')
    expect(r.cues).toHaveLength(cues.length)
    r.cues.forEach((c, i) => expect(c.start).toBeCloseTo(Math.max(0, cues[i].start - 2.5), 2))
    expect(r.segments).toBe(1)
    expect(r.offsetSec).toBe(-2.5)
  })

  it('reports a failing alass', async () => {
    await expect(withMode('fail')).rejects.toThrow(/code 3.*failing on purpose/s)
  })

  it('rejects a result with lines missing', async () => {
    await expect(withMode('drop')).rejects.toThrow(/returned 39 of 40 lines/)
  })

  it('matches lines by label when alass reorders them', async () => {
    const r = await withMode('reverse')
    r.cues.forEach((c, i) => expect(c.start).toBeCloseTo(cues[i].start, 2))
  })

  it('stops when cancelled', async () => {
    const controller = new AbortController()
    const pending = withMode('hang', { signal: controller.signal })
    setTimeout(() => controller.abort(), 200)
    await expect(pending).rejects.toThrow('cancelled')
  })

  it('stops after the time limit', async () => {
    await expect(withMode('hang', { timeoutMs: 200 })).rejects.toThrow(/code|signal|null/i)
  })

  it('does not run alass when almost no speech was found', async () => {
    await expect(
      runAlass('unused', new Uint8Array(1000), cues, { launcher: FAKE })
    ).rejects.toThrow(/Too little speech/)
  })
})
