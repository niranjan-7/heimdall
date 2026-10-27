import { app, BrowserWindow, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { spawn } from 'child_process'
import { UpdateInfo, UpdateDownloadProgress } from '../shared/types'

export class UpdateService {
  private getMainWindow: () => BrowserWindow | null

  constructor(getMainWindow: () => BrowserWindow | null) {
    this.getMainWindow = getMainWindow
  }

  /**
   * Creates a timestamped safety backup of library.json and settings.json
   * in %APPDATA%/Heimdall/backups/ to guarantee 0 data loss.
   */
  public createBackup(): { success: boolean; backupPath?: string; error?: string } {
    try {
      const userData = app.getPath('userData')
      const backupsDir = path.join(userData, 'backups')
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true })
      }

      const libraryPath = path.join(userData, 'library.json')
      const settingsPath = path.join(userData, 'settings.json')

      const dateStr = new Date().toISOString().replace(/[:.]/g, '-')
      const snapshotPath = path.join(backupsDir, `heimdall_backup_${dateStr}.json`)
      const latestPreUpdatePath = path.join(backupsDir, 'library_pre_update.json')

      const libraryContent = fs.existsSync(libraryPath)
        ? JSON.parse(fs.readFileSync(libraryPath, 'utf-8'))
        : { series: [], movies: [] }

      const settingsContent = fs.existsSync(settingsPath)
        ? JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
        : {}

      const backupBundle = {
        timestamp: Date.now(),
        version: app.getVersion(),
        library: libraryContent,
        settings: settingsContent
      }

      fs.writeFileSync(snapshotPath, JSON.stringify(backupBundle, null, 2), 'utf-8')
      fs.writeFileSync(latestPreUpdatePath, JSON.stringify(backupBundle, null, 2), 'utf-8')
      return { success: true, backupPath: snapshotPath }
    } catch (err: any) {
      console.error('Backup creation error:', err)
      return { success: false, error: err?.message || 'Failed to create backup' }
    }
  }

  /**
   * Checks GitHub Releases for new Heimdall versions.
   */
  public async checkForUpdates(): Promise<UpdateInfo> {
    const currentVersion = app.getVersion()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

      const res = await fetch('https://api.github.com/repos/niranjan-7/heimdall/releases/latest', {
        headers: {
          'User-Agent': `Heimdall-App/${currentVersion}`,
          Accept: 'application/vnd.github.v3+json'
        },
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!res.ok) {
        return {
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          releaseNotes: `Unable to query releases (HTTP ${res.status}).`
        }
      }

      const data = await res.json()
      const tagName: string = data.tag_name || ''
      const latestVersion = tagName.replace(/^v/i, '')

      const hasUpdate = this.compareVersions(latestVersion, currentVersion) > 0

      // Match correct platform asset
      let targetAsset: any = null
      if (Array.isArray(data.assets)) {
        if (process.platform === 'win32') {
          targetAsset = data.assets.find(
            (a: any) => a.name.endsWith('.exe') && !a.name.includes('blockmap')
          )
        } else if (process.platform === 'darwin') {
          targetAsset = data.assets.find((a: any) => a.name.endsWith('.dmg'))
        } else {
          targetAsset = data.assets.find((a: any) => a.name.endsWith('.AppImage'))
        }
      }

      return {
        hasUpdate,
        currentVersion,
        latestVersion,
        releaseDate: data.published_at ? new Date(data.published_at).toLocaleDateString() : undefined,
        releaseNotes: data.body || 'No release notes provided.',
        downloadUrl: targetAsset ? targetAsset.browser_download_url : data.html_url,
        assetName: targetAsset?.name ?? null,
        assetSize: targetAsset?.size ?? null
      }
    } catch (err: any) {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        releaseNotes: `Failed to check for updates: ${err?.message || 'Network error'}`
      }
    }
  }

  /**
   * Downloads installer with progress stream and executes update.
   */
  public async downloadAndInstallUpdate(
    downloadUrl: string,
    assetName?: string
  ): Promise<{ success: boolean; message?: string }> {
    // 1. Mandatory Pre-Update Snapshot
    this.createBackup()

    const win = this.getMainWindow()
    const targetName = assetName || (process.platform === 'win32' ? 'Heimdall_Setup.exe' : 'Heimdall_Update')
    const destPath = path.join(app.getPath('temp'), targetName)

    try {
      const response = await fetch(downloadUrl)
      if (!response.ok || !response.body) {
        return { success: false, message: `Download failed: HTTP ${response.status}` }
      }

      const contentLength = Number(response.headers.get('content-length')) || 0
      let receivedBytes = 0

      const fileStream = fs.createWriteStream(destPath)
      const reader = response.body.getReader()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        if (value) {
          receivedBytes += value.length
          fileStream.write(Buffer.from(value))

          const percent = contentLength > 0 ? Math.round((receivedBytes / contentLength) * 100) : 0
          if (win && !win.isDestroyed()) {
            win.webContents.send('update:download-progress', {
              percent,
              transferred: receivedBytes,
              total: contentLength
            } as UpdateDownloadProgress)
          }
        }
      }

      await new Promise((resolve) => fileStream.end(resolve))

      // 2. Launch Installer
      if (process.platform === 'win32') {
        spawn(destPath, [], { detached: true, stdio: 'ignore' }).unref()
        app.quit()
        return { success: true }
      } else if (process.platform === 'linux') {
        fs.chmodSync(destPath, 0o755)
        spawn(destPath, [], { detached: true, stdio: 'ignore' }).unref()
        app.quit()
        return { success: true }
      } else {
        await shell.openPath(destPath)
        return { success: true }
      }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to download installer.' }
    }
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map((p) => parseInt(p, 10) || 0)
    const parts2 = v2.split('.').map((p) => parseInt(p, 10) || 0)

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0
      const num2 = parts2[i] || 0
      if (num1 > num2) return 1
      if (num1 < num2) return -1
    }
    return 0
  }
}
