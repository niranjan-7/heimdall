import { describe, expect, it } from 'vitest'
import { resolveBinaryPath } from '../src/main/binaries'

const base = {
  platform: 'linux' as NodeJS.Platform,
  arch: 'x64',
  projectRoot: '/proj',
  exists: () => true
}

describe('resolveBinaryPath', () => {
  it('uses <resources>/bin in a packaged app', () => {
    expect(resolveBinaryPath('ffmpeg', { ...base, resourcesPath: '/opt/Heimdall/resources' })).toBe(
      '/opt/Heimdall/resources/bin/ffmpeg'
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
      '/proj/resources/bin/mac-arm64/ffmpeg'
    )
  })

  it("treats electron's own resources folder as unpackaged when defaultApp is set", () => {
    expect(
      resolveBinaryPath('ffmpeg', {
        ...base,
        resourcesPath: '/node_modules/electron/dist/resources',
        defaultApp: true
      })
    ).toBe('/proj/resources/bin/linux-x64/ffmpeg')
  })

  it('falls back to the system PATH when the bundled file is missing', () => {
    expect(resolveBinaryPath('ffmpeg', { ...base, exists: () => false })).toBe('ffmpeg')
  })
})
