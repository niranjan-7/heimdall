import { SyncConfidence } from '../../shared/types'
import { alignNative, describeScale } from './aligner'
import { AlassResult } from './alassAligner'
import { Cue, TimingTransform, applyTransform } from './subtitleFormat'
import {
  SyncMetrics,
  Verdict,
  capBySections,
  evaluateCues,
  evaluateTiming,
  judge,
  transformMoves
} from './verifier'

/** How a candidate moves the subtitle: one shift and stretch, or a time for every cue. */
export type Timing =
  { kind: 'transform'; transform: TimingTransform } | { kind: 'cues'; cues: Cue[] }

export interface Candidate {
  engine: 'alass' | 'native'
  timing: Timing
  metrics: SyncMetrics
  verdict: Verdict
  /** Typical shift, in seconds, for the message shown to the user. */
  offsetSec: number
  scale: number
  fpsChange?: string
  /** Sections with different shifts (1 for a single shift). */
  sections: number
}

export interface EngineResult {
  original: SyncMetrics
  best: Candidate
  tried: Candidate[]
  /** Why alass wasn't used, when it was available but failed. */
  alassError?: string
}

const RANK: Record<SyncConfidence, number> = { low: 0, medium: 1, high: 2 }

/** Higher confidence wins, then higher score; on a tie the earlier candidate (alass) stays. */
function better(a: Candidate, b: Candidate): Candidate {
  const byConfidence = RANK[b.verdict.confidence] - RANK[a.verdict.confidence]
  if (byConfidence !== 0) return byConfidence > 0 ? b : a
  return b.metrics.score > a.metrics.score ? b : a
}

function fpsText(scale: number): string | undefined {
  const fps = describeScale(scale)
  return fps ? `${fps.from} → ${fps.to} fps` : undefined
}

function maxMove(original: Cue[], aligned: Cue[]): number {
  return aligned.reduce((m, c, i) => Math.max(m, Math.abs(c.start - original[i].start)), 0)
}

function alassCandidate(
  speech: Uint8Array,
  cues: Cue[],
  original: SyncMetrics,
  result: AlassResult
): Candidate {
  const metrics = evaluateCues(speech, result.cues)
  const verdict = judge(original, metrics, maxMove(cues, result.cues) >= 0.1)
  return {
    engine: 'alass',
    timing: { kind: 'cues', cues: result.cues },
    metrics,
    verdict: { ...verdict, confidence: capBySections(verdict.confidence, result.segments) },
    offsetSec: result.offsetSec,
    scale: result.scale,
    fpsChange: result.fpsChange,
    sections: result.segments
  }
}

function nativeCandidate(speech: Uint8Array, cues: Cue[], original: SyncMetrics): Candidate {
  const transform = alignNative(speech, cues)
  const metrics = evaluateTiming(speech, cues, transform)
  return {
    engine: 'native',
    timing: { kind: 'transform', transform },
    metrics,
    verdict: judge(original, metrics, transformMoves(transform)),
    offsetSec: transform.offset,
    scale: transform.scale,
    fpsChange: fpsText(transform.scale),
    sections: 1
  }
}

/** The new times of every cue under a timing, in the order of `cues`. */
export function timedCues(cues: Cue[], timing: Timing): Cue[] {
  if (timing.kind === 'cues') return timing.cues
  return cues.map((c) => ({
    start: applyTransform(c.start, timing.transform),
    end: applyTransform(c.end, timing.transform)
  }))
}

/**
 * Finds the best timing for `cues` (in file order) against the detected speech.
 * `runAlass` is given when alass is bundled for this platform. It is tried first; the built-in
 * aligner runs too unless alass already gave a confident result, and also if alass fails.
 */
export async function findBestTiming(opts: {
  speech: Uint8Array
  cues: Cue[]
  runAlass?: () => Promise<AlassResult>
}): Promise<EngineResult> {
  const { speech, cues } = opts
  const original = evaluateCues(speech, cues)
  const tried: Candidate[] = []
  let alassError: string | undefined

  if (opts.runAlass) {
    try {
      tried.push(alassCandidate(speech, cues, original, await opts.runAlass()))
    } catch (err) {
      if ((err as Error)?.message === 'cancelled') throw err
      alassError = (err as Error)?.message || 'alass failed'
    }
  }

  const first = tried[0]
  const settled = first && (first.verdict.alreadyInSync || first.verdict.confidence === 'high')
  if (!settled) tried.push(nativeCandidate(speech, cues, original))

  return { original, best: tried.reduce(better), tried, alassError }
}
