import { spawn } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import { join } from 'path'
import { FRAME_SEC } from './speechEnvelope'
import { Cue, cuesToSrt, parseCues } from './subtitleFormat'
import { nearestFpsChange } from './aligner'

/**
 * alass (https://github.com/kaegi/alass) aligns one subtitle to another. We give it the speech we
 * detected in the audio as a "subtitle" (one line per stretch of speech) and the real subtitle as
 * the one to fix. Unlike a single shift it can also split the subtitle where a section was cut or
 * added, and correct frame-rate differences. This avoids alass's own audio decoding, so it needs
 * neither ffmpeg nor ffprobe.
 */

const toMs = (sec: number): number => Math.round(sec * 1000) / 1000

/** Stretches of speech as cues; gaps shorter than `joinGapSec` are bridged. */
export function speechToCues(speech: Uint8Array, joinGapSec = 0.25): Cue[] {
  const cues: Cue[] = []
  let start = -1
  for (let i = 0; i <= speech.length; i++) {
    const on = i < speech.length && speech[i] === 1
    if (on && start < 0) start = i
    if (!on && start >= 0) {
      const cue = { start: toMs(start * FRAME_SEC), end: toMs(i * FRAME_SEC) }
      const last = cues[cues.length - 1]
      if (last && cue.start - last.end < joinGapSec) last.end = cue.end
      else cues.push(cue)
      start = -1
    }
  }
  return cues
}

export interface AlassShift {
  /** Number of sections that got different shifts (1 = one shift for the whole subtitle). */
  segments: number
  /** Typical shift of the biggest section, in seconds. */
  offsetSec: number
  /** Stretch of the biggest section (1 = none). */
  scale: number
  fpsChange?: string
}

/** A jump between neighbouring lines bigger than this starts a new section. */
const SPLIT_JUMP_SEC = 1

/** Summarises how alass moved the lines (both lists in the same, file order). */
export function summarizeShift(original: Cue[], aligned: Cue[]): AlassShift {
  const deltas = aligned.map((c, i) => c.start - original[i].start)
  const sections: number[][] = []
  deltas.forEach((d, i) => {
    if (i === 0 || Math.abs(d - deltas[i - 1]) > SPLIT_JUMP_SEC) sections.push([])
    sections[sections.length - 1].push(i)
  })

  const biggest = sections.reduce((a, b) => (b.length > a.length ? b : a), sections[0] ?? [])
  const sorted = biggest.map((i) => deltas[i]).sort((a, b) => a - b)
  const offsetSec = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0

  let scale = 1
  if (biggest.length >= 2) {
    const first = biggest[0]
    const last = biggest[biggest.length - 1]
    const span = original[last].start - original[first].start
    if (span > 60) {
      const slope = (aligned[last].start - aligned[first].start) / span
      scale = Math.abs(slope - 1) < 0.0005 ? 1 : slope
    }
  }
  const fps = nearestFpsChange(scale)
  return {
    segments: Math.max(1, sections.length),
    offsetSec: Math.round(offsetSec * 100) / 100,
    scale,
    fpsChange: fps ? `${fps.from} → ${fps.to} fps` : undefined
  }
}

export interface AlassResult extends AlassShift {
  /** New time of every cue, in file order. */
  cues: Cue[]
}

export interface AlassOptions {
  signal?: AbortSignal
  timeoutMs?: number
  /** How eager alass is to avoid splitting (higher = fewer sections). */
  splitPenalty?: number
  /** Run this instead of the binary itself (tests use it to run a stand-in script). */
  launcher?: { file: string; args: string[] }
}

function runProcess(
  file: string,
  args: string[],
  signal: AbortSignal | undefined,
  timeoutMs: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true })
    let stderr = ''
    child.stderr.on('data', (d: Buffer) => {
      stderr = (stderr + d.toString()).slice(-2000)
    })
    const kill = (): void => {
      child.kill('SIGKILL')
    }
    const timer = setTimeout(kill, timeoutMs)
    signal?.addEventListener('abort', kill, { once: true })

    const finish = (): void => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', kill)
    }
    child.on('error', (err) => {
      finish()
      reject(err)
    })
    child.on('close', (code) => {
      finish()
      if (signal?.aborted) return reject(new Error('cancelled'))
      if (code === 0) return resolve()
      reject(new Error(`alass exited with code ${code}${stderr ? `: ${stderr.trim()}` : ''}`))
    })
  })
}

/**
 * Runs alass on the detected speech and the subtitle's cues (in file order) and returns the new
 * time of every cue. Throws if alass fails or gives back a different number of lines.
 */
export async function runAlass(
  binary: string,
  speech: Uint8Array,
  cues: Cue[],
  opts: AlassOptions = {}
): Promise<AlassResult> {
  const reference = speechToCues(speech)
  if (reference.length < 10) throw new Error('Too little speech was detected for alass.')

  const dir = fs.mkdtempSync(join(os.tmpdir(), 'heimdall-alass-'))
  try {
    const refPath = join(dir, 'speech.srt')
    const incPath = join(dir, 'subtitle.srt')
    const outPath = join(dir, 'synced.srt')
    fs.writeFileSync(refPath, cuesToSrt(reference))
    fs.writeFileSync(incPath, cuesToSrt(cues))

    const launcher = opts.launcher ?? { file: binary, args: [] }
    await runProcess(
      launcher.file,
      [
        ...launcher.args,
        refPath,
        incPath,
        outPath,
        '--split-penalty',
        String(opts.splitPenalty ?? 10),
        '--allow-negative-timestamps'
      ],
      opts.signal,
      opts.timeoutMs ?? 180_000
    )

    const aligned = parseCues(fs.readFileSync(outPath, 'utf-8'), 'srt', { fileOrder: true })
    if (aligned.length !== cues.length) {
      throw new Error(`alass returned ${aligned.length} lines for ${cues.length}.`)
    }
    return { cues: aligned, ...summarizeShift(cues, aligned) }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}
