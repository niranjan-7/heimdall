import { FRAME_SEC } from './speechEnvelope'
import { Cue, TimingTransform } from './subtitleFormat'
import { COARSE_SEC, coverage, cueIndices, toCoarse } from './timeline'

/** Frame-rate mismatches seen in practice. `scale` stretches subtitle times: t' = scale * t. */
export const FPS_CORRECTIONS: { scale: number; from: string; to: string }[] = [
  { scale: 1, from: '', to: '' },
  { scale: 25 / 23.976, from: '25', to: '23.976' },
  { scale: 23.976 / 25, from: '23.976', to: '25' },
  { scale: 24 / 23.976, from: '24', to: '23.976' },
  { scale: 23.976 / 24, from: '23.976', to: '24' },
  { scale: 25 / 24, from: '25', to: '24' },
  { scale: 24 / 25, from: '24', to: '25' }
]

export interface AlignOptions {
  /** Largest shift searched, in seconds. */
  maxShiftSec?: number
}

/**
 * Finds the timing transform that puts the most subtitle time on top of detected speech.
 *
 * 1. For every frame-rate correction, slide the cues over ±maxShift in 100 ms steps.
 * 2. Keep the best; a frame-rate change has to win clearly, since a plain shift is far more common.
 * 3. Refine the shift in 10 ms steps around the winner.
 */
export function alignNative(
  speech: Uint8Array,
  cues: Cue[],
  opts: AlignOptions = {}
): TimingTransform {
  const coarse = toCoarse(speech)
  const maxLag = Math.round((opts.maxShiftSec ?? 120) / COARSE_SEC)

  let best = { scale: 1, lag: 0, score: -1 }
  let bestPlain = -1
  for (const { scale } of FPS_CORRECTIONS) {
    const idx = cueIndices(cues, { offset: 0, scale }, COARSE_SEC)
    for (let lag = -maxLag; lag <= maxLag; lag++) {
      const c = coverage(coarse, idx, lag)
      if (scale === 1 && c > bestPlain) bestPlain = c
      const margin = scale === 1 ? 0 : 0.03
      if (c > best.score + margin && (scale === 1 || c > bestPlain + margin)) {
        best = { scale, lag, score: c }
      }
    }
  }

  const ratio = Math.round(COARSE_SEC / FRAME_SEC)
  const fineIdx = cueIndices(cues, { offset: 0, scale: best.scale }, FRAME_SEC)
  const center = best.lag * ratio
  const scores: number[] = []
  for (let lag = center - 2 * ratio; lag <= center + 2 * ratio; lag++) {
    scores.push(coverage(speech, fineIdx, lag))
  }
  // The score is often flat over a few frames (cues run a little longer than the speech). Take the
  // middle of the flat top around the best frame rather than its first frame.
  const top = Math.max(...scores)
  const peak = scores.indexOf(top)
  let left = peak
  let right = peak
  while (left > 0 && scores[left - 1] >= top - 0.002) left--
  while (right < scores.length - 1 && scores[right + 1] >= top - 0.002) right++
  const fineLag = center - 2 * ratio + Math.round((left + right) / 2)

  return { scale: best.scale, offset: Math.round(fineLag * FRAME_SEC * 1000) / 1000 }
}

export function describeScale(scale: number): { from: string; to: string } | null {
  const hit = FPS_CORRECTIONS.find((f) => f.scale !== 1 && Math.abs(f.scale - scale) < 1e-6)
  return hit ? { from: hit.from, to: hit.to } : null
}

/**
 * The known frame-rate change closest to a measured stretch. 24 ↔ 23.976 differ from "no change"
 * by only 0.1%, so the tolerance has to stay well under that and a stretch of 1 never matches.
 */
export function nearestFpsChange(
  scale: number,
  tolerance = 0.0004
): { from: string; to: string } | null {
  if (scale === 1) return null
  let best: { from: string; to: string } | null = null
  let bestDiff = tolerance
  for (const f of FPS_CORRECTIONS) {
    const diff = Math.abs(f.scale - scale)
    if (f.scale !== 1 && diff < bestDiff) {
      best = { from: f.from, to: f.to }
      bestDiff = diff
    }
  }
  return best
}
