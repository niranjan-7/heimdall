// Pure update helpers (no Electron imports) so they can be unit-tested.

export type UpdateChannel = 'stable' | 'beta'

export interface GitHubRelease {
  tag_name: string
  draft: boolean
  prerelease: boolean
  body?: string | null
  html_url: string
  published_at?: string | null
}

interface ParsedVersion {
  core: [number, number, number]
  pre: string[]
}

const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/

export function parseVersion(version: string): ParsedVersion | null {
  const m = VERSION_PATTERN.exec(version.trim())
  if (!m) return null
  return {
    core: [Number(m[1]), Number(m[2]), Number(m[3])],
    pre: m[4] ? m[4].split('.') : []
  }
}

function comparePreIdentifier(a: string, b: string): number {
  const aNum = /^\d+$/.test(a)
  const bNum = /^\d+$/.test(b)
  if (aNum && bNum) return Number(a) - Number(b)
  if (aNum) return -1 // numeric identifiers sort before alphanumeric ones
  if (bNum) return 1
  return a < b ? -1 : a > b ? 1 : 0
}

/** Semver ordering: positive if a > b. "1.5.0-rc.1" < "1.5.0" < "1.5.1". Unparsable sorts lowest. */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  if (!pa || !pb) return pa ? 1 : pb ? -1 : 0

  for (let i = 0; i < 3; i++) {
    if (pa.core[i] !== pb.core[i]) return pa.core[i] - pb.core[i]
  }
  if (pa.pre.length === 0 && pb.pre.length === 0) return 0
  if (pa.pre.length === 0) return 1
  if (pb.pre.length === 0) return -1

  for (let i = 0; i < Math.max(pa.pre.length, pb.pre.length); i++) {
    if (pa.pre[i] === undefined) return -1
    if (pb.pre[i] === undefined) return 1
    const diff = comparePreIdentifier(pa.pre[i], pb.pre[i])
    if (diff !== 0) return diff
  }
  return 0
}

/** Newest published release for the channel. Stable ignores pre-releases; beta includes them. */
export function pickLatestRelease(
  releases: GitHubRelease[],
  channel: UpdateChannel
): GitHubRelease | null {
  let best: GitHubRelease | null = null
  for (const release of releases) {
    if (release.draft) continue
    if (channel === 'stable' && release.prerelease) continue
    if (!parseVersion(release.tag_name)) continue
    if (!best || compareVersions(release.tag_name, best.tag_name) > 0) best = release
  }
  return best
}

/**
 * Whether this build can download, verify and install an update by itself.
 * Windows (NSIS) and the Linux AppImage can. macOS needs a signed app first, and .deb/.tar.gz
 * installs are managed by the user, so those open the release page instead.
 */
export function canSelfInstall(opts: {
  platform: NodeJS.Platform
  isPackaged: boolean
  appImage?: string
}): boolean {
  if (!opts.isPackaged) return false
  if (opts.platform === 'win32') return true
  if (opts.platform === 'linux') return !!opts.appImage
  return false
}
