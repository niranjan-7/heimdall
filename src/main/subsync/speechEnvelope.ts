import { spawn } from 'child_process'

/** One analysis frame is 10 ms. */
export const FRAME_SEC = 0.01
export const SAMPLE_RATE = 16000
const SAMPLES_PER_FRAME = SAMPLE_RATE * FRAME_SEC

/**
 * Turns a stream of 16-bit mono PCM into one loudness value (dBFS) per 10 ms frame. Feed it the
 * chunks ffmpeg writes; chunks may split samples and frames anywhere.
 */
export class FrameEnergyMeter {
  private energies: number[] = []
  private sumSquares = 0
  private count = 0
  private leftover: Buffer | null = null

  push(chunk: Buffer): void {
    let buf = chunk
    if (this.leftover) {
      buf = Buffer.concat([this.leftover, chunk])
      this.leftover = null
    }
    const usable = buf.length - (buf.length % 2)
    for (let i = 0; i < usable; i += 2) {
      const v = buf.readInt16LE(i) / 32768
      this.sumSquares += v * v
      if (++this.count === SAMPLES_PER_FRAME) this.flushFrame()
    }
    if (usable < buf.length) this.leftover = buf.subarray(usable)
  }

  private flushFrame(): void {
    const meanSquare = this.sumSquares / this.count
    this.energies.push(10 * Math.log10(meanSquare + 1e-10))
    this.sumSquares = 0
    this.count = 0
  }

  finish(): Float32Array {
    if (this.count > 0) this.flushFrame()
    return Float32Array.from(this.energies)
  }
}

const HIST_MIN = -100
const HIST_BIN = 0.5
const HIST_BINS = 200 // -100 dB .. 0 dB

function bin(db: number): number {
  return Math.min(HIST_BINS - 1, Math.max(0, Math.floor((db - HIST_MIN) / HIST_BIN)))
}

/**
 * Marks each 10 ms frame as speech (1) or not (0).
 *
 * The threshold adapts to the surrounding 30 s: halfway between the quiet floor (10th percentile)
 * and the loud peaks (90th percentile) of that window, and at least 10 dB above the floor, so a
 * quiet stretch never counts. Steady music raises the floor, so speech over it can still stand out.
 * Hysteresis is ±1.5 dB, and nothing below -55 dBFS counts. Runs shorter
 * than 150 ms are dropped and gaps shorter than 100 ms are filled. This is an energy detector on
 * the voice band (ffmpeg filters the audio to 200-3500 Hz first), not a true voice detector: loud
 * music in that band can still count as speech.
 */
export function detectSpeech(energies: Float32Array): Uint8Array {
  const n = energies.length
  const out = new Uint8Array(n)
  if (n === 0) return out

  const half = 1500 // 15 s on each side
  const step = 100 // recompute the threshold every 1 s
  const hist = new Int32Array(HIST_BINS)
  let lo = 0
  let hi = 0
  let total = 0
  const thresholds = new Float32Array(Math.ceil(n / step))

  for (let c = 0; c < thresholds.length; c++) {
    const center = c * step
    const wantLo = Math.max(0, center - half)
    const wantHi = Math.min(n, center + half)
    while (hi < wantHi) {
      hist[bin(energies[hi++])]++
      total++
    }
    while (lo < wantLo) {
      hist[bin(energies[lo++])]--
      total--
    }
    const p10 = percentile(hist, total, 0.1)
    const p90 = percentile(hist, total, 0.9)
    thresholds[c] = Math.max(p10 + 10, (p10 + p90) / 2)
  }

  const silenceFloor = -55
  let on = false
  for (let i = 0; i < n; i++) {
    const thr = Math.max(thresholds[Math.floor(i / step)], silenceFloor)
    const e = energies[i]
    if (on ? e < thr - 1.5 : e > thr + 1.5) on = !on
    out[i] = on ? 1 : 0
  }

  fillRuns(out, 0, 10) // gaps < 100 ms
  fillRuns(out, 1, 15) // speech < 150 ms
  return out
}

function percentile(hist: Int32Array, total: number, q: number): number {
  let acc = 0
  for (let b = 0; b < HIST_BINS; b++) {
    acc += hist[b]
    if (acc >= total * q) return HIST_MIN + (b + 0.5) * HIST_BIN
  }
  return 0
}

/** Flips runs of `value` shorter than `minLen` frames that sit between two other runs. */
function fillRuns(a: Uint8Array, value: 0 | 1, minLen: number): void {
  let i = 0
  while (i < a.length) {
    if (a[i] !== value) {
      i++
      continue
    }
    let j = i
    while (j < a.length && a[j] === value) j++
    const inner = i > 0 && j < a.length
    if (j - i < minLen && (inner || value === 1)) a.fill(value === 1 ? 0 : 1, i, j)
    i = j
  }
}

export interface ExtractOptions {
  audioTrack?: number
  signal?: AbortSignal
  onProgress?: (fraction: number) => void
}

function parseClock(text: string): number {
  const [h, m, s] = text.split(':')
  return Number(h) * 3600 + Number(m) * 60 + Number(s)
}

/** Runs ffmpeg over the whole file's audio and returns the 10 ms speech frames. */
export function extractSpeech(
  ffmpegPath: string,
  videoPath: string,
  opts: ExtractOptions = {}
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const args = [
      '-nostdin',
      '-hide_banner',
      '-stats',
      '-i',
      videoPath,
      '-map',
      `0:a:${opts.audioTrack ?? 0}`,
      '-vn',
      '-sn',
      '-dn',
      '-ac',
      '1',
      '-ar',
      String(SAMPLE_RATE),
      '-af',
      'highpass=f=200,lowpass=f=3500',
      '-f',
      's16le',
      '-'
    ]
    const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const meter = new FrameEnergyMeter()
    let duration = 0
    let stderrTail = ''

    const onAbort = (): void => {
      child.kill('SIGKILL')
    }
    opts.signal?.addEventListener('abort', onAbort, { once: true })

    child.stdout.on('data', (chunk: Buffer) => meter.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderrTail = (stderrTail + text).slice(-2000)
      if (!duration) {
        const d = /Duration:\s*(\d+:\d{2}:\d{2}(?:\.\d+)?)/.exec(stderrTail)
        if (d) duration = parseClock(d[1])
      }
      const t = /time=\s*(\d+:\d{2}:\d{2}(?:\.\d+)?)/.exec(text) || /time=\s*(\d+:\d{2}:\d{2}(?:\.\d+)?)/.exec(stderrTail)
      if (t && duration > 0) opts.onProgress?.(Math.min(1, parseClock(t[1]) / duration))
    })

    child.on('error', (err) => {
      opts.signal?.removeEventListener('abort', onAbort)
      reject(err)
    })
    child.on('close', (code) => {
      opts.signal?.removeEventListener('abort', onAbort)
      if (opts.signal?.aborted) return reject(new Error('cancelled'))
      if (code !== 0) {
        const reason = /does not contain any stream|matches no streams/i.test(stderrTail)
          ? 'This video has no audio track to analyse.'
          : `ffmpeg exited with code ${code}`
        return reject(new Error(reason))
      }
      opts.onProgress?.(1)
      resolve(detectSpeech(meter.finish()))
    })
  })
}
