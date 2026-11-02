import { app, BrowserWindow, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import * as path from 'path'
import * as fs from 'fs'
import { UpdateInfo, UpdateDownloadProgress } from '../shared/types'
import { StorageService } from './storageService'
import {
  GitHubRelease,
  UpdateChannel,
  canSelfInstall,
  compareVersions,
  pickLatestRelease
} from './updateLogic'

const RELEASES_API = 'https://api.github.com/repos/niranjan-7/heimdall/releases?per_page=30'
const RELEASES_PAGE = 'https://github.com/niranjan-7/heimdall/releases'

export class UpdateService {
  private getMainWindow: () => BrowserWindow | null
  private storageService: StorageService

  constructor(getMainWindow: () => BrowserWindow | null, storageService: StorageService) {
    this.getMainWindow = getMainWindow
    this.storageService = storageService

    // Heimdall decides when to download and install; electron-updater does the downloading,
    // checks the file against the sha512 in latest*.yml, and installs.
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false
    autoUpdater.on('download-progress', (p) => {
      const win = this.getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('update:download-progress', {
          percent: Math.round(p.percent),
          transferred: p.transferred,
          total: p.total
        } as UpdateDownloadProgress)
      }
    })
  }

  /**
   * Creates a timestamped backup of library.json and settings.json in
   * <userData>/backups/.
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

  private channel(): UpdateChannel {
    return this.storageService.getSettings().updateChannel === 'beta' ? 'beta' : 'stable'
  }

  /** Looks for a newer release on the selected channel. Works on every platform. */
  public async checkForUpdates(): Promise<UpdateInfo> {
    const currentVersion = app.getVersion()
    const channel = this.channel()
    const canInstall = canSelfInstall({
      platform: process.platform,
      isPackaged: app.isPackaged,
      appImage: process.env.APPIMAGE
    })
    const noUpdate = (releaseNotes?: string): UpdateInfo => ({
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      releaseNotes,
      releaseUrl: RELEASES_PAGE,
      canInstall,
      channel
    })

    try {
      const res = await fetch(RELEASES_API, {
        headers: {
          'User-Agent': `Heimdall-App/${currentVersion}`,
          Accept: 'application/vnd.github+json'
        },
        signal: AbortSignal.timeout(6000)
      })
      if (!res.ok) return noUpdate(`Could not check for updates (HTTP ${res.status}).`)

      const releases = (await res.json()) as GitHubRelease[]
      const latest = pickLatestRelease(releases, channel)
      if (!latest) return noUpdate()

      const latestVersion = latest.tag_name.replace(/^v/i, '')
      return {
        hasUpdate: compareVersions(latestVersion, currentVersion) > 0,
        currentVersion,
        latestVersion,
        releaseDate: latest.published_at
          ? new Date(latest.published_at).toLocaleDateString()
          : undefined,
        releaseNotes: latest.body || 'No release notes provided.',
        releaseUrl: latest.html_url,
        canInstall,
        channel
      }
    } catch (err: any) {
      return noUpdate(`Could not check for updates: ${err?.message || 'network error'}`)
    }
  }

  /**
   * Installs the newest update. Where the app cannot install by itself (macOS until it is
   * signed, .deb and .tar.gz installs) it opens the release page instead.
   */
  public async downloadAndInstallUpdate(): Promise<{ success: boolean; message?: string }> {
    const info = await this.checkForUpdates()
    if (!info.hasUpdate) return { success: false, message: 'No newer version is available.' }

    if (!info.canInstall) {
      const url = info.releaseUrl?.startsWith('https://github.com/')
        ? info.releaseUrl
        : RELEASES_PAGE
      await shell.openExternal(url)
      return { success: true, message: 'Opened the download page in your browser.' }
    }

    const backup = this.createBackup()
    if (!backup.success) {
      return {
        success: false,
        message: `Update cancelled: could not back up your library (${backup.error}).`
      }
    }

    try {
      autoUpdater.allowPrerelease = this.channel() === 'beta'
      const result = await autoUpdater.checkForUpdates()
      const offered = result?.updateInfo?.version
      if (!offered || compareVersions(offered, app.getVersion()) <= 0) {
        return { success: false, message: 'The update could not be found. Try again later.' }
      }

      // Downloads the installer and checks it against the sha512 in latest*.yml.
      await autoUpdater.downloadUpdate()
      setImmediate(() => autoUpdater.quitAndInstall(false, true))
      return { success: true }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to download the update.' }
    }
  }
}
