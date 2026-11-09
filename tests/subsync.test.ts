import { describe, expect, it } from 'vitest'
import {
  Cue,
  TimingTransform,
  applyTransform,
  formatFromPath,
  parseCues,
  retimeSubtitle
} from '../src/main/subsync/subtitleFormat'
import { FRAME_SEC, FrameEnergyMeter, detectSpeech } from '../src/main/subsync/speechEnvelope'
import { alignNative, describeScale } from '../src/main/subsync/aligner'
import { invert, makeCues, makeSpeech, rng } from './helpers/syncFixtures'
import { evaluateTiming, judge, transformMoves } from '../src/main/subsync/verifier'

const MINUTES = 24
const truth = makeCues(MINUTES, 7)
const speech = makeSpeech(truth, MINUTES, 11)

function syncResult(subCues: Cue[]) {
  const tr = alignNative(speech, subCues)
  const original = evaluateTiming(speech, subCues, { offset: 0, scale: 1 })
  const aligned = evaluateTiming(speech, subCues, tr)
  return { tr, original, aligned, verdict: judge(original, aligned, transformMoves(tr)) }
}

/** Largest error, in seconds, between where the synced cues land and where they belong. */
function maxError(subCues: Cue[], tr: TimingTransform): number {
  return Math.max(...subCues.map((c, i) => Math.abs(applyTransform(c.start, tr) - truth[i].start)))
}

// --- Aligner and verifier --------------------------------------------------------------------

describe('native aligner', () => {
  it.each([0.5, -2.3, 15, -60, 110])('recovers a constant shift of %s s', (shift) => {
    const broken = invert(truth, { offset: shift, scale: 1 })
    const { tr, verdict } = syncResult(broken)
    expect(tr.scale).toBe(1)
    expect(maxError(broken, tr)).toBeLessThanOrEqual(0.1)
    expect(verdict).toEqual({ confidence: 'high', alreadyInSync: false })
  })

  it('recovers subtitles timed for 25 fps on a 23.976 fps video', () => {
    const broken = invert(truth, { offset: 1.2, scale: 25 / 23.976 })
    const { tr, verdict } = syncResult(broken)
    expect(describeScale(tr.scale)).toEqual({ from: '25', to: '23.976' })
    expect(maxError(broken, tr)).toBeLessThanOrEqual(0.1)
    expect(verdict.confidence).toBe('high')
  })

  it('recovers subtitles timed for 23.976 fps on a 25 fps video', () => {
    const broken = invert(truth, { offset: -0.8, scale: 23.976 / 25 })
    const { tr } = syncResult(broken)
    expect(describeScale(tr.scale)).toEqual({ from: '23.976', to: '25' })
    expect(maxError(broken, tr)).toBeLessThanOrEqual(0.1)
  })

  it('says subtitles that are already right are in sync', () => {
    const { verdict, original } = syncResult(truth)
    expect(original.score).toBeGreaterThanOrEqual(75)
    expect(verdict.alreadyInSync).toBe(true)
  })

  it('refuses subtitles that belong to a different episode', () => {
    const other = makeCues(MINUTES, 99)
    const { verdict, aligned } = syncResult(other)
    expect(aligned.score).toBeLessThan(60)
    expect(verdict.confidence).toBe('low')
  })

  it('refuses when the audio has no usable speech', () => {
    const silent = new Uint8Array(speech.length)
    const broken = invert(truth, { offset: 3, scale: 1 })
    const tr = alignNative(silent, broken)
    const verdict = judge(
      evaluateTiming(silent, broken, { offset: 0, scale: 1 }),
      evaluateTiming(silent, broken, tr),
      transformMoves(tr)
    )
    expect(verdict.confidence).toBe('low')
  })
})

// --- Speech detection ------------------------------------------------------------------------

function pcm(seconds: number, loudAt: (t: number) => boolean): Buffer {
  const rate = 16000
  const buf = Buffer.alloc(seconds * rate * 2)
  const r = rng(3)
  for (let i = 0; i < seconds * rate; i++) {
    const t = i / rate
    const amp = loudAt(t) ? 0.3 : 0.003
    buf.writeInt16LE(Math.round((r() * 2 - 1) * amp * 32767), i * 2)
  }
  return buf
}

describe('speech detection', () => {
  it('finds loud stretches and ignores quiet ones, across odd chunk boundaries', () => {
    const loud = (t: number): boolean => (t > 5 && t < 8) || (t > 20 && t < 21.5)
    const buf = pcm(40, loud)
    const meter = new FrameEnergyMeter()
    for (let i = 0; i < buf.length; i += 4097) meter.push(buf.subarray(i, i + 4097))
    const frames = detectSpeech(meter.finish())
    expect(frames.length).toBe(4000)
    const at = (t: number): number => frames[Math.round(t / FRAME_SEC)]
    expect(at(6.5)).toBe(1)
    expect(at(20.7)).toBe(1)
    expect(at(2)).toBe(0)
    expect(at(14)).toBe(0)
    expect(at(30)).toBe(0)
  })

  it('drops blips shorter than 150 ms', () => {
    const buf = pcm(30, (t) => t > 10 && t < 10.08)
    const meter = new FrameEnergyMeter()
    meter.push(buf)
    expect(detectSpeech(meter.finish()).reduce((a, b) => a + b, 0)).toBe(0)
  })
})

// --- Subtitle formats ------------------------------------------------------------------------

const SRT = [
  '1',
  '00:00:01,000 --> 00:00:02,500',
  'Hello',
  '',
  '2',
  '00:00:05,000 --> 00:00:07,250',
  '<i>Two</i> lines',
  'here',
  ''
].join('\r\n')

const VTT = [
  'WEBVTT',
  '',
  'NOTE made by hand',
  '',
  '00:01.000 --> 00:02.500 align:start',
  'Hi',
  '',
  'cue-2',
  '01:00:05.000 --> 01:00:07.000',
  'Later',
  ''
].join('\n')

const ASS = [
  '[Script Info]',
  'Title: test',
  '',
  '[Events]',
  'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  'Dialogue: 0,0:00:01.00,0:00:02.50,Default,,0,0,0,,{\\i1}Hello, world{\\i0}',
  'Comment: 0,0:00:03.00,0:00:04.00,Default,,0,0,0,,note',
  'Dialogue: 0,0:00:05.00,0:00:07.25,Sign,,0,0,0,,Two'
].join('\n')

describe('subtitle formats', () => {
  it('detects the format from the extension', () => {
    expect(formatFromPath('/a/b.EN.SRT')).toBe('srt')
    expect(formatFromPath('x.ssa')).toBe('ass')
    expect(formatFromPath('x.vtt')).toBe('vtt')
    expect(formatFromPath('x.sub')).toBeNull()
  })

  it('reads cues from SRT, VTT and ASS', () => {
    expect(parseCues(SRT, 'srt')).toEqual([
      { start: 1, end: 2.5 },
      { start: 5, end: 7.25 }
    ])
    expect(parseCues(VTT, 'vtt')).toEqual([
      { start: 1, end: 2.5 },
      { start: 3605, end: 3607 }
    ])
    expect(parseCues(ASS, 'ass')).toEqual([
      { start: 1, end: 2.5 },
      { start: 5, end: 7.25 }
    ])
  })

  it('retimes SRT and keeps text, numbering and line endings', () => {
    const out = retimeSubtitle(SRT, 'srt', { offset: 1.5, scale: 1 })
    expect(out).toContain('00:00:02,500 --> 00:00:04,000\r\nHello')
    expect(out).toContain('2\r\n00:00:06,500 --> 00:00:08,750\r\n<i>Two</i> lines\r\nhere')
  })

  it('drops cues pushed before zero and renumbers SRT', () => {
    const out = retimeSubtitle(SRT, 'srt', { offset: -3, scale: 1 })
    expect(out).not.toContain('Hello')
    expect(out.startsWith('1\r\n00:00:02,000 --> 00:00:04,250')).toBe(true)
  })

  it('retimes VTT and keeps the header, notes, cue ids and settings', () => {
    const out = retimeSubtitle(VTT, 'vtt', { offset: 0, scale: 2 })
    expect(out.startsWith('WEBVTT\n\nNOTE made by hand\n\n')).toBe(true)
    expect(out).toContain('00:00:02.000 --> 00:00:05.000 align:start\nHi')
    expect(out).toContain('cue-2\n02:00:10.000 --> 02:00:14.000\nLater')
  })

  it('retimes ASS dialogue only and keeps styling and commas in the text', () => {
    const out = retimeSubtitle(ASS, 'ass', { offset: 0.5, scale: 1 })
    expect(out).toContain(
      'Dialogue: 0,0:00:01.50,0:00:03.00,Default,,0,0,0,,{\\i1}Hello, world{\\i0}'
    )
    expect(out).toContain('Comment: 0,0:00:03.00,0:00:04.00,Default,,0,0,0,,note')
    expect(out).toContain('Dialogue: 0,0:00:05.50,0:00:07.75,Sign,,0,0,0,,Two')
    expect(out).toContain('[Script Info]\nTitle: test')
  })
})
