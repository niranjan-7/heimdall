import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let userData: string

vi.mock('electron', () => ({ app: { getPath: () => userData } }))

const { StorageService } = await import('../src/main/storageService')

beforeEach(() => {
  userData = fs.mkdtempSync(path.join(os.tmpdir(), 'heimdall-settings-'))
})

afterEach(() => {
  fs.rmSync(userData, { recursive: true, force: true })
})

function writeSettings(settings: object): void {
  fs.writeFileSync(path.join(userData, 'settings.json'), JSON.stringify(settings))
}

function readSettings() {
  return JSON.parse(fs.readFileSync(path.join(userData, 'settings.json'), 'utf8'))
}

describe('StorageService secrets', () => {
  it('replaces the old shared VLC password with a random one', () => {
    writeSettings({ httpPassword: 'heimdall_secret' })
    const settings = new StorageService().getSettings()
    expect(settings.httpPassword).not.toBe('heimdall_secret')
    expect(settings.httpPassword.length).toBeGreaterThanOrEqual(20)
    expect(readSettings().httpPassword).toBe(settings.httpPassword)
  })

  it('keeps a password the user already changed', () => {
    writeSettings({ httpPassword: 'my-own-password' })
    expect(new StorageService().getSettings().httpPassword).toBe('my-own-password')
  })

  it('gives every install different secrets', () => {
    const a = new StorageService().getSettings()
    fs.rmSync(path.join(userData, 'settings.json'))
    const b = new StorageService().getSettings()
    expect(a.httpPassword).not.toBe(b.httpPassword)
    expect(a.remoteToken).not.toBe(b.remoteToken)
  })

  it('creates a pairing code once and keeps it across restarts', () => {
    const first = new StorageService().getSettings().remoteToken
    expect(first).toMatch(/^[A-Za-z0-9_-]{32}$/)
    expect(new StorageService().getSettings().remoteToken).toBe(first)
  })

  it('does not let a settings save change the pairing code', () => {
    const storage = new StorageService()
    const code = storage.getSettings().remoteToken
    storage.saveSettings({ remoteToken: 'stale', completionThreshold: 0.8 })
    expect(storage.getSettings().remoteToken).toBe(code)
    expect(storage.getSettings().completionThreshold).toBe(0.8)
  })

  it('keeps the phone remote off for new installs', () => {
    expect(new StorageService().getSettings().enableRemoteServer).toBe(false)
  })
})
