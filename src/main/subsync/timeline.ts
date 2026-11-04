import { FRAME_SEC } from './speechEnvelope'
import { Cue, TimingTransform, applyTransform } from './subtitleFormat'

/** Coarse grid used for searching and scoring: 100 ms = 10 speech frames. */
export const COARSE_SEC = 0.1
const FRAMES_PER_COARSE = Math.round(COARSE_SEC / FRAME_SEC)

/** Fraction of speech in each 100 ms step. */
export function toCoarse(speech: Uint8Array): Float32Array {
  const n = Math.ceil(speech.length / FRAMES_PER_COARSE)
  const out = new Float32Array(n)
  for (let j = 0; j < n; j++) {
    let sum = 0
    const end = Math.min(speech.length, (j + 1) * FRAMES_PER_COARSE)
    for (let i = j * FRAMES_PER_COARSE; i < end; i++) sum += speech[i]
    out[j] = sum / (end - j * FRAMES_PER_COARSE)
  }
  return out
}

/**
 * Grid indices covered by the (transformed) cues. A step counts when its centre is inside a cue.
 * Indices may fall outside the audio; `coverage` skips those.
 */
export function cueIndices(cues: Cue[], tr: TimingTransform, stepSec: number): Int32Array {
  const idx: number[] = []
  for (const cue of cues) {
    const s = applyTransform(cue.start, tr)
    const e = applyTransform(cue.end, tr)
    const from = Math.ceil(s / stepSec - 0.5)
    const to = Math.floor(e / stepSec - 0.5)
    for (let i = from; i <= to; i++) idx.push(i)
  }
  return Int32Array.from(idx)
}

/**
 * Average speech under the cues when they are moved by `lag` grid steps. Steps outside the audio
 * are ignored; returns 0 if too few steps are left to judge.
 */
export function coverage(signal: Float32Array | Uint8Array, idx: Int32Array, lag: number): number {
  let sum = 0
  let count = 0
  const n = signal.length
  for (let k = 0; k < idx.length; k++) {
    const i = idx[k] + lag
    if (i >= 0 && i < n) {
      sum += signal[i]
      count++
    }
  }
  return count >= Math.max(20, idx.length * 0.5) ? sum / count : 0
}

export function mean(a: Float32Array | Uint8Array): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i]
  return a.length ? s / a.length : 0
}
