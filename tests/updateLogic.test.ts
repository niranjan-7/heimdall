import { describe, expect, it } from 'vitest'
import {
  GitHubRelease,
  canSelfInstall,
  compareVersions,
  pickLatestRelease
} from '../src/main/updateLogic'

describe('compareVersions', () => {
  it.each([
    ['1.5.0', '1.4.0'],
    ['1.10.0', '1.9.9'],
    ['2.0.0', '1.99.99'],
    ['1.5.0', '1.5.0-rc.1'],
    ['1.5.0-rc.2', '1.5.0-rc.1'],
    ['1.5.0-rc.10', '1.5.0-rc.2'],
    ['2.0.0-beta.1', '2.0.0-alpha.3'],
    ['1.5.0-rc.1', '1.4.9'],
    ['v1.5.0', '1.4.0']
  ])('%s is newer than %s', (a, b) => {
    expect(compareVersions(a, b)).toBeGreaterThan(0)
    expect(compareVersions(b, a)).toBeLessThan(0)
  })

  it('treats equal versions as equal', () => {
    expect(compareVersions('1.5.0', 'v1.5.0')).toBe(0)
    expect(compareVersions('2.0.0-beta.1', '2.0.0-beta.1')).toBe(0)
  })

  it('sorts unparsable versions lowest', () => {
    expect(compareVersions('1.0.0', 'nightly')).toBeGreaterThan(0)
  })
})

function release(tag: string, extra: Partial<GitHubRelease> = {}): GitHubRelease {
  return { tag_name: tag, draft: false, prerelease: tag.includes('-'), html_url: tag, ...extra }
}

describe('pickLatestRelease', () => {
  const releases = [
    release('v1.4.0'),
    release('v1.5.0'),
    release('v2.0.0-beta.1'),
    release('v1.6.0', { draft: true }),
    release('not-a-version')
  ]

  it('ignores pre-releases and drafts on the stable channel', () => {
    expect(pickLatestRelease(releases, 'stable')?.tag_name).toBe('v1.5.0')
  })

  it('includes pre-releases on the beta channel', () => {
    expect(pickLatestRelease(releases, 'beta')?.tag_name).toBe('v2.0.0-beta.1')
  })

  it('prefers a final release over its own pre-release on beta', () => {
    const list = [release('v2.0.0-rc.1'), release('v2.0.0')]
    expect(pickLatestRelease(list, 'beta')?.tag_name).toBe('v2.0.0')
  })

  it('returns null when nothing qualifies', () => {
    expect(pickLatestRelease([release('v1.0.0', { draft: true })], 'stable')).toBeNull()
  })
})

describe('canSelfInstall', () => {
  it('installs by itself on Windows and from an AppImage', () => {
    expect(canSelfInstall({ platform: 'win32', isPackaged: true })).toBe(true)
    expect(
      canSelfInstall({ platform: 'linux', isPackaged: true, appImage: '/home/u/Heimdall.AppImage' })
    ).toBe(true)
  })

  it('opens the download page for macOS (unsigned) and .deb/.tar.gz installs', () => {
    expect(canSelfInstall({ platform: 'darwin', isPackaged: true })).toBe(false)
    expect(canSelfInstall({ platform: 'linux', isPackaged: true })).toBe(false)
  })

  it('never installs from a development build', () => {
    expect(canSelfInstall({ platform: 'win32', isPackaged: false })).toBe(false)
  })
})
