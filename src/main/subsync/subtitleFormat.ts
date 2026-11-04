/** Subtitle formats the sync engine can read and retime. */
export type SubtitleFormat = 'srt' | 'vtt' | 'ass'

export interface Cue {
  start: number
  end: number
}

/** corrected(t) = scale * t + offset, in seconds. */
export interface TimingTransform {
  offset: number
  scale: number
}

export function formatFromPath(filePath: string): SubtitleFormat | null {
  const ext = filePath.toLowerCase().split('.').pop()
  if (ext === 'srt') return 'srt'
  if (ext === 'vtt') return 'vtt'
  if (ext === 'ass' || ext === 'ssa') return 'ass'
  return null
}

// SRT: 00:01:02,345   VTT: 00:01:02.345 or 01:02.345
const SRT_VTT_TIME = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/
const SRT_VTT_LINE = new RegExp(
  `^(\\s*)(${SRT_VTT_TIME.source})(\\s*-->\\s*)(${SRT_VTT_TIME.source})(.*)$`
)
// ASS: Dialogue: Layer,Start,End,... with h:mm:ss.cc
const ASS_TIME = /^(\d+):(\d{2}):(\d{2})\.(\d{1,3})$/

function parseSrtVttTime(text: string): number | null {
  const m = SRT_VTT_TIME.exec(text)
  if (!m) return null
  const frac = m[4].padEnd(3, '0')
  return Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(frac) / 1000
}

function parseAssTime(text: string): number | null {
  const m = ASS_TIME.exec(text.trim())
  if (!m) return null
  const frac = m[4].padEnd(3, '0')
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(frac) / 1000
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0')
}

function formatSrtVttTime(sec: number, sep: ',' | '.'): string {
  const ms = Math.max(0, Math.round(sec * 1000))
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}${sep}${pad(ms % 1000, 3)}`
}

function formatAssTime(sec: number): string {
  const cs = Math.max(0, Math.round(sec * 100))
  const h = Math.floor(cs / 360000)
  const m = Math.floor((cs % 360000) / 6000)
  const s = Math.floor((cs % 6000) / 100)
  return `${h}:${pad(m, 2)}:${pad(s, 2)}.${pad(cs % 100, 2)}`
}

/** Splits an ASS Dialogue line into "Dialogue: Layer", Start, End and the rest. */
function splitAssDialogue(line: string): [string, string, string, string] | null {
  if (!/^Dialogue:/i.test(line)) return null
  const parts = line.split(',')
  if (parts.length < 4) return null
  return [parts[0], parts[1], parts[2], parts.slice(3).join(',')]
}

export function parseCues(content: string, format: SubtitleFormat): Cue[] {
  const cues: Cue[] = []
  for (const line of content.split(/\r?\n/)) {
    if (format === 'ass') {
      const parts = splitAssDialogue(line)
      if (!parts) continue
      const start = parseAssTime(parts[1])
      const end = parseAssTime(parts[2])
      if (start !== null && end !== null && end > start) cues.push({ start, end })
    } else {
      const m = SRT_VTT_LINE.exec(line)
      if (!m) continue
      const start = parseSrtVttTime(m[2])
      const end = parseSrtVttTime(m[8])
      if (start !== null && end !== null && end > start) cues.push({ start, end })
    }
  }
  return cues.sort((a, b) => a.start - b.start)
}

export function applyTransform(t: number, tr: TimingTransform): number {
  return tr.scale * t + tr.offset
}

/**
 * Rewrites only the timestamps; text, styling and everything else stay as they were. Cues that end
 * before 0 are dropped (SRT cues renumbered), cues that start before 0 start at 0.
 */
export function retimeSubtitle(
  content: string,
  format: SubtitleFormat,
  tr: TimingTransform
): string {
  const newline = content.includes('\r\n') ? '\r\n' : '\n'
  const lines = content.split(/\r?\n/)

  if (format === 'ass') {
    const out: string[] = []
    for (const line of lines) {
      const parts = splitAssDialogue(line)
      const start = parts && parseAssTime(parts[1])
      const end = parts && parseAssTime(parts[2])
      if (!parts || start === null || end === null) {
        out.push(line)
        continue
      }
      const s = applyTransform(start, tr)
      const e = applyTransform(end, tr)
      if (e <= 0) continue
      out.push(`${parts[0]},${formatAssTime(s)},${formatAssTime(e)},${parts[3]}`)
    }
    return out.join(newline)
  }

  // SRT and VTT: work block by block so dropped cues take their text with them.
  const sep = format === 'srt' ? ',' : '.'
  const blocks: string[][] = [[]]
  for (const line of lines) {
    if (line.trim() === '') {
      if (blocks[blocks.length - 1].length > 0) blocks.push([])
    } else {
      blocks[blocks.length - 1].push(line)
    }
  }

  const out: string[][] = []
  let index = 1
  for (const block of blocks) {
    if (block.length === 0) continue
    const timeIdx = block.findIndex((l) => SRT_VTT_LINE.test(l))
    if (timeIdx === -1) {
      out.push(block) // VTT header, NOTE, STYLE blocks
      continue
    }
    const m = SRT_VTT_LINE.exec(block[timeIdx]) as RegExpExecArray
    const start = parseSrtVttTime(m[2]) as number
    const end = parseSrtVttTime(m[8]) as number
    const s = applyTransform(start, tr)
    const e = applyTransform(end, tr)
    if (e <= 0) continue
    const next = [...block]
    next[timeIdx] = `${m[1]}${formatSrtVttTime(s, sep)}${m[7]}${formatSrtVttTime(e, sep)}${m[13]}`
    if (format === 'srt' && timeIdx === 1 && /^\d+$/.test(next[0].trim())) {
      next[0] = String(index)
    }
    index++
    out.push(next)
  }
  const body = out.map((b) => b.join(newline)).join(newline + newline)
  return body + newline
}
