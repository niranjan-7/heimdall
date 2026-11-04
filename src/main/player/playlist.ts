import * as fs from 'fs'

export interface PlaylistEntry {
  path: string
  /** External subtitle to load and select for this file only. */
  subFile?: string
}

/** Uses the synced subtitle only if it is still on disk. */
export function existingSubFile(subPath?: string): string | undefined {
  return subPath && fs.existsSync(subPath) ? subPath : undefined
}

/**
 * mpv file arguments. Per-file options go in `--{ ... --}` blocks so they apply to that file only:
 * the start time to the first file, each synced subtitle to its own episode. A single --sub-file is
 * selected by default.
 */
export function mpvPlaylistArgs(entries: PlaylistEntry[], startTime: number): string[] {
  const args: string[] = []
  entries.forEach((entry, i) => {
    const opts: string[] = []
    if (i === 0 && startTime > 0) opts.push(`--start=${Math.max(0, Math.floor(startTime))}`)
    if (entry.subFile) opts.push(`--sub-file=${entry.subFile}`)
    if (opts.length) args.push('--{', ...opts, entry.path, '--}')
    else args.push(entry.path)
  })
  return args
}

/**
 * VLC file arguments. An option with a single leading colon applies only to the item before it;
 * a global --start-time would make every later episode start halfway through.
 */
export function vlcPlaylistArgs(entries: PlaylistEntry[], startTime: number): string[] {
  const args: string[] = []
  entries.forEach((entry, i) => {
    args.push(entry.path)
    if (i === 0 && startTime > 0) args.push(`:start-time=${Math.max(0, Math.floor(startTime))}`)
    if (entry.subFile) args.push(`:sub-file=${entry.subFile}`)
  })
  return args
}

/** VLC's --sub-delay counts in tenths of a second. */
export function vlcSubDelayArg(delaySec: number): string {
  return `--sub-delay=${Math.round(delaySec * 10)}`
}
