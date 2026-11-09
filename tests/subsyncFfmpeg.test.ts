import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import { join } from 'path'
import { getBinaryPath } from '../src/main/binaries'
import { extractSpeech } from '../src/main/subsync/speechEnvelope'
import { alignNative } from '../src/main/subsync/aligner'
import { evaluateTiming, judge, transformMoves } from '../src/main/subsync/verifier'
import { applyTransform } from '../src/main/subsync/subtitleFormat'
import { invert, makeCues, rng } from './helpers/syncFixtures'

/**
 * End to end through the real ffmpeg: a generated soundtrack (noise "voices" during the cues over a
 * steady music bed and room noise) -> speech detection -> alignment -> verifier.
 * Runs in CI, where the bundled ffmpeg is fetched first; set HEIMDALL_FFMPEG_TESTS=1 to run locally.
 */
const enabled = process.env.HEIMDALL_FFMPEG_TESTS === '1'

const MINUTES = 10
const RATE = 16000
const truth = makeCues(MINUTES, 21)

function writeWav(file: string): void {
  const n = MINUTES * 60 * RATE
  const data = Buffer.alloc(n * 2)
  const r = rng(5)
  const voiced = new Uint8Array(n)
  for (const c of truth) {
    if (r() < 0.1) continue // a line the detector won't hear
    voiced.fill(1, Math.round((c.start + 0.15) * RATE), Math.round((c.end - 0.1) * RATE))
  }
  let syllable = 0
  for (let i = 0; i < n; i++) {
    const t = i / RATE
    // Speech-like: noise in ~5 Hz syllable bursts. Music: a quiet 220 Hz tone. Room: faint noise.
    if (i % 3200 === 0) syllable = 0.5 + r() * 0.5
    const voice = voiced[i] ? (r() * 2 - 1) * 0.35 * syllable * (0.6 + 0.4 * Math.sin(t * 31)) : 0
    const music = 0.02 * Math.sin(2 * Math.PI * 220 * t)
    const room = (r() * 2 - 1) * 0.004
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, voice + music + room)) * 32767), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(RATE, 24)
  header.writeUInt32LE(RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  fs.writeFileSync(file, Buffer.concat([header, data]))
}

describe.runIf(enabled)('subtitle sync with the real ffmpeg', () => {
  let dir = ''
  let speech: Uint8Array

  beforeAll(async () => {
    dir = fs.mkdtempSync(join(os.tmpdir(), 'heimdall-subsync-'))
    const wav = join(dir, 'episode.wav')
    writeWav(wav)
    const fractions: number[] = []
    speech = await extractSpeech(getBinaryPath('ffmpeg'), wav, {
      onProgress: (f) => fractions.push(f)
    })
    expect(fractions.length).toBeGreaterThan(0)
  }, 120_000)

  afterAll(() => {
    if (dir) fs.rmSync(dir, { recursive: true, force: true })
  })

  it('produces one frame per 10 ms', () => {
    expect(Math.abs(speech.length - MINUTES * 6000)).toBeLessThanOrEqual(2)
  })

  it.each([
    { offset: 3.4, scale: 1 },
    { offset: -42, scale: 1 },
    { offset: 0.8, scale: 25 / 23.976 }
  ])('recovers %o within 150 ms and applies it', (shift) => {
    const broken = invert(truth, shift)
    const tr = alignNative(speech, broken)
    const err = Math.max(
      ...broken.map((c, i) => Math.abs(applyTransform(c.start, tr) - truth[i].start))
    )
    expect(err).toBeLessThanOrEqual(0.15)
    const verdict = judge(
      evaluateTiming(speech, broken, { offset: 0, scale: 1 }),
      evaluateTiming(speech, broken, tr),
      transformMoves(tr)
    )
    expect(verdict.confidence).toBe('high')
  })

  it('refuses a subtitle for another episode', () => {
    const other = makeCues(MINUTES, 77)
    const tr = alignNative(speech, other)
    const verdict = judge(
      evaluateTiming(speech, other, { offset: 0, scale: 1 }),
      evaluateTiming(speech, other, tr),
      transformMoves(tr)
    )
    expect(verdict.confidence).toBe('low')
  })

  it('fails clearly on a file with no audio', async () => {
    const txt = join(dir, 'not-a-video.txt')
    fs.writeFileSync(txt, 'hello')
    await expect(extractSpeech(getBinaryPath('ffmpeg'), txt)).rejects.toThrow()
  })
})
