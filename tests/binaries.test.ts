import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { findBundledBinary, resolveBinaryPath } from '../src/main/binaries'

const base = {
  platform: 'linux' as NodeJS.Platform,
  arch: 'x64',
  projectRoot: '/proj',
  exists: () => true
}

describe('resolveBinaryPath', () => {
  it('uses <resources>/bin in a packaged app', () => {
    expect(resolveBinaryPath('ffmpeg', { ...base, resourcesPath: '/opt/Heimdall/resources' })).toBe(
      join('/opt/Heimdall/resources', 'bin', 'ffmpeg')
    )
  })

  it('adds .exe on Windows', () => {
    expect(
      resolveBinaryPath('ffmpeg', {
        ...base,
        platform: 'win32',
        resourcesPath: 'C:\\App\\resources',
        exists: () => true
      })
    ).toMatch(/bin[\\/]ffmpeg\.exe$/)
  })

  it('uses resources/bin/<os>-<arch> when running unpackaged', () => {
    expect(resolveBinaryPath('ffmpeg', { ...base, platform: 'darwin', arch: 'arm64' })).toBe(
      join('/proj', 'resources', 'bin', 'mac-arm64', 'ffmpeg')
    )
  })

  it("treats electron's own resources folder as unpackaged when defaultApp is set", () => {
    expect(
      resolveBinaryPath('ffmpeg', {
        ...base,
        resourcesPath: '/node_modules/electron/dist/resources',
        defaultApp: true
      })
    ).toBe(join('/proj', 'resources', 'bin', 'linux-x64', 'ffmpeg'))
  })

  it('falls back to the system PATH when the bundled file is missing', () => {
    expect(resolveBinaryPath('ffmpeg', { ...base, exists: () => false })).toBe('ffmpeg')
  })
})

describe('findBundledBinary', () => {
  it('returns null instead of a PATH name when the program is not bundled', () => {
    const opts = { ...base, resourcesPath: '/opt/Heimdall/resources', exists: () => false }
    expect(findBundledBinary('alass-cli', opts)).toBeNull()
    expect(resolveBinaryPath('alass-cli', opts)).toBe('alass-cli')
  })

  it('finds alass-cli next to ffmpeg, with .exe on Windows', () => {
    expect(
      findBundledBinary('alass-cli', { ...base, resourcesPath: '/opt/Heimdall/resources' })
    ).toBe(join('/opt/Heimdall/resources', 'bin', 'alass-cli'))
    expect(
      findBundledBinary('alass-cli', { ...base, platform: 'win32', resourcesPath: 'C:\\App' })
    ).toMatch(/bin[\\/]alass-cli\.exe$/)
  })
})
