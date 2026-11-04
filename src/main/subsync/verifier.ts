import { Cue, TimingTransform } from './subtitleFormat'
import { COARSE_SEC, coverage, cueIndices, mean, toCoarse } from './timeline'
import { SyncConfidence } from '../../shared/types'

export interface SyncMetrics {
  /** How much more speech sits under the cues than chance would give (0..1). */
  lift: number
  /** How far the score at this timing stands out from the best timing 1-60 s away (0..1). */
  sharpness: number
  /** Share of the episode's sections (by time) whose own best shift is within 0.3 s of this one. */
  agreement: number
  /** 0-100 combined score. */
  score: number
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

/**
 * Scores a timing independently of how it was found. Used on both the original subtitle and the
 * aligned one, so the result can be compared rather than trusted.
 */
export function evaluateTiming(speech: Uint8Array, cues: Cue[], tr: TimingTransform): SyncMetrics {
  const coarse = toCoarse(speech)
  const idx = cueIndices(cues, tr, COARSE_SEC)
  const p = mean(coarse)
  const c0 = coverage(coarse, idx, 0)

  let cOther = 0
  for (let lag = 10; lag <= 600; lag++) {
    cOther = Math.max(cOther, coverage(coarse, idx, lag), coverage(coarse, idx, -lag))
  }

  const lift = p < 1 ? (c0 - p) / (1 - p) : 0
  const sharpness = cOther < 1 ? (c0 - cOther) / (1 - cOther) : 0
  const agreement = sectionAgreement(coarse, cues, tr)

  const score = Math.round(
    100 * (0.35 * clamp01(lift / 0.5) + 0.25 * clamp01(sharpness / 0.2) + 0.4 * agreement)
  )
  return { lift, sharpness, agreement, score }
}

/** Splits the cues into 8 sections by time and checks each section's best local shift. */
function sectionAgreement(coarse: Float32Array, cues: Cue[], tr: TimingTransform): number {
  if (cues.length < 10) return 0
  const sections = 8
  const first = cues[0].start
  const span = cues[cues.length - 1].end - first || 1
  let used = 0
  let agree = 0
  for (let s = 0; s < sections; s++) {
    const lo = first + (span * s) / sections
    const hi = first + (span * (s + 1)) / sections
    const part = cues.filter((c) => c.start >= lo && c.start < hi)
    if (part.length < 5) continue
    const idx = cueIndices(part, tr, COARSE_SEC)
    let bestLag = 0
    let bestC = -1
    for (let lag = -50; lag <= 50; lag++) {
      const c = coverage(coarse, idx, lag)
      // Prefer the smaller shift on ties so an in-sync section counts as agreeing.
      if (c > bestC + 1e-9 || (Math.abs(c - bestC) <= 1e-9 && Math.abs(lag) < Math.abs(bestLag))) {
        bestC = c
        bestLag = lag
      }
    }
    if (bestC <= 0) continue
    used++
    if (Math.abs(bestLag) <= 3) agree++
  }
  return used >= 3 ? agree / used : 0
}

export interface Verdict {
  confidence: SyncConfidence
  alreadyInSync: boolean
}

export const HIGH_SCORE = 75
export const MEDIUM_SCORE = 60
const MIN_IMPROVEMENT = 10

/**
 * High: apply automatically. Medium: ask first. Low: change nothing.
 * If the original already scores high and the aligner barely moved it, it is already in sync.
 */
export function judge(original: SyncMetrics, aligned: SyncMetrics, tr: TimingTransform): Verdict {
  const moved = Math.abs(tr.offset) >= 0.1 || tr.scale !== 1
  if (
    original.score >= HIGH_SCORE &&
    (!moved || aligned.score - original.score < MIN_IMPROVEMENT)
  ) {
    return { confidence: 'high', alreadyInSync: true }
  }
  const improvement = aligned.score - original.score
  if (aligned.score >= HIGH_SCORE && improvement >= MIN_IMPROVEMENT) {
    return { confidence: 'high', alreadyInSync: false }
  }
  if (aligned.score >= MEDIUM_SCORE && improvement >= MIN_IMPROVEMENT) {
    return { confidence: 'medium', alreadyInSync: false }
  }
  return { confidence: 'low', alreadyInSync: false }
}
