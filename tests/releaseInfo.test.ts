import { describe, expect, it } from 'vitest'
import {
  buildReleaseInfo,
  expectedAssets,
  extractSection,
  missingAssets,
  parseTag
} from '../scripts/release-info.mjs'

const changelog = `# Changelog

## [Unreleased]

- Something not released yet.

## [1.5.0] - 2026-11-20

### Fixed
- The thing.

## [1.4.0] - 2026-10-28

- Old entry.

## [1.3.0] - 2026-10-20
`

describe('parseTag', () => {
  it('accepts stable and pre-release tags', () => {
    expect(parseTag('v1.5.0')).toEqual({ version: '1.5.0', base: '1.5.0', prerelease: false })
    expect(parseTag('v2.0.0-beta.1')).toEqual({
      version: '2.0.0-beta.1',
      base: '2.0.0',
      prerelease: true
    })
  })

  it.each(['1.5.0', 'v1.5', 'v1.5.0.1', 'release-1.5.0', 'v1.5.0-'])('rejects %s', (tag) => {
    expect(() => parseTag(tag)).toThrow(/not a release tag/)
  })
})

describe('extractSection', () => {
  it('returns the body of one version without its neighbours', () => {
    expect(extractSection(changelog, '1.5.0')).toBe('### Fixed\n- The thing.')
    expect(extractSection(changelog, '1.4.0')).toBe('- Old entry.')
  })

  it('returns null for a missing or empty section', () => {
    expect(extractSection(changelog, '9.9.9')).toBeNull()
    expect(extractSection(changelog, '1.3.0')).toBeNull()
  })

  it('handles Windows line endings', () => {
    expect(extractSection(changelog.replace(/\n/g, '\r\n'), '1.4.0')).toBe('- Old entry.')
  })
})

describe('buildReleaseInfo', () => {
  it('returns the notes for a matching stable tag', () => {
    const info = buildReleaseInfo({ tag: 'v1.5.0', packageVersion: '1.5.0', changelog })
    expect(info).toEqual({
      version: '1.5.0',
      prerelease: false,
      notes: '### Fixed\n- The thing.'
    })
  })

  it('rejects a tag that differs from package.json', () => {
    expect(() => buildReleaseInfo({ tag: 'v1.5.0', packageVersion: '1.4.0', changelog })).toThrow(
      /does not match package.json version 1.4.0/
    )
  })

  it('rejects a stable release with no changelog section', () => {
    expect(() => buildReleaseInfo({ tag: 'v1.6.0', packageVersion: '1.6.0', changelog })).toThrow(
      /no "## \[1.6.0\]" section/
    )
  })

  it('lets a pre-release reuse its base version notes', () => {
    const info = buildReleaseInfo({ tag: 'v1.5.0-rc.1', packageVersion: '1.5.0-rc.1', changelog })
    expect(info.prerelease).toBe(true)
    expect(info.notes).toBe('### Fixed\n- The thing.')
  })

  it('does not require a changelog section for a pre-release', () => {
    const info = buildReleaseInfo({
      tag: 'v3.0.0-beta.1',
      packageVersion: '3.0.0-beta.1',
      changelog
    })
    expect(info.notes).toMatch(/Pre-release build for testing/)
  })

  it('reports the package version for a branch build', () => {
    expect(buildReleaseInfo({ packageVersion: '1.4.0', changelog })).toEqual({
      version: '1.4.0',
      prerelease: false,
      notes: ''
    })
  })
})

describe('missingAssets', () => {
  it('lists nothing when every file is there', () => {
    expect(missingAssets('1.5.0', expectedAssets('1.5.0'))).toEqual([])
  })

  it('lists exactly the files that are absent', () => {
    const names = expectedAssets('1.5.0').filter((n) => n !== 'latest-mac.yml')
    expect(missingAssets('1.5.0', names)).toEqual(['latest-mac.yml'])
  })

  it('names files after the version', () => {
    expect(expectedAssets('2.0.0-beta.1')).toContain('Heimdall-Setup-2.0.0-beta.1.exe')
  })
})
