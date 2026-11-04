import { Cue, TimingTransform } from '../../src/main/subsync/subtitleFormat'
import { FRAME_SEC } from '../../src/main/subsync/speechEnvelope'

/** Small deterministic PRNG so the tests never flake. */
export function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

/** Dialogue cues over `minutes`, with realistic line lengths and pauses. */
export function makeCues(minutes: number, seed: number): Cue[] {
  const r = rng(seed)
  const cues: Cue[] = []
  let t = 20 + r() * 10
  while (t < minutes * 60 - 10) {
    const len = 1 + r() * 3.5
    cues.push({ start: t, end: t + len })
    t += len + 0.3 + r() ** 2 * 8
  }
  return cues
}

/**
 * Speech frames for those cues as an imperfect detector would see them: speech starts a little
 * after the cue and ends a little before, some lines are missed, and loud music adds false speech.
 */
export function makeSpeech(cues: Cue[], minutes: number, seed: number): Uint8Array {
  const r = rng(seed)
  const n = Math.round((minutes * 60) / FRAME_SEC)
  const speech = new Uint8Array(n)
  const mark = (s: number, e: number): void => {
    speech.fill(1, Math.max(0, Math.round(s / FRAME_SEC)), Math.min(n, Math.round(e / FRAME_SEC)))
  }
  for (const c of cues) {
    if (r() < 0.12) continue // missed line
    mark(c.start + 0.1 + r() * 0.2, c.end - r() * 0.3)
  }
  // Music / effects: 25 bursts of 2-12 s
  for (let k = 0; k < 25; k++) {
    const s = r() * minutes * 60
    mark(s, s + 2 + r() * 10)
  }
  return speech
}

export const invert = (cues: Cue[], tr: TimingTransform): Cue[] =>
  cues.map((c) => ({
    start: (c.start - tr.offset) / tr.scale,
    end: (c.end - tr.offset) / tr.scale
  }))
