import React, { useState, useEffect } from 'react'
import {
  AppSettings,
  MediaPlayerType,
  Anime4KPreset,
  UpdateInfo,
  UpdateDownloadProgress
} from '../../../shared/types'
import {
  Settings,
  FolderOpen,
  Check,
  X,
  Shield,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Film,
  UserCheck,
  Zap,
  Sliders,
  Search,
  Play,
  Languages,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Archive
} from 'lucide-react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: (newSettings: AppSettings) => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [validatingToken, setValidatingToken] = useState(false)
  const [tokenFeedback, setTokenFeedback] = useState<string | null>(null)
  const [detectStatus, setDetectStatus] = useState<string | null>(null)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [downloadingUpdate, setDownloadingUpdate] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<UpdateDownloadProgress | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [backingUp, setBackingUp] = useState(false)
  const [discordStatus, setDiscordStatus] = useState<{ isConnected: boolean; username: string; clientId: string } | null>(null)
  const [isReconnectingDiscord, setIsReconnectingDiscord] = useState(false)

  useEffect(() => {
    if (isOpen) {
      window.api.getSettings().then((s) => {
        setSettings(s)
        setTokenInput(s.aniListToken || '')
      })
      if (window.api.getDiscordStatus) {
        window.api.getDiscordStatus().then(setDiscordStatus).catch(() => {})
      }
      setSavedSuccess(false)
      setTokenFeedback(null)
      setDetectStatus(null)
      setUpdateError(null)

      // Background check for latest version on settings open
      window.api
        .checkForUpdates()
        .then((info) => setUpdateInfo(info))
        .catch(() => {})
    }

    const unsubProgress = window.api.onUpdateDownloadProgress((progress) => {
      setDownloadProgress(progress)
    })

    return () => {
      unsubProgress()
    }
  }, [isOpen])

  const handleReconnectDiscord = async () => {
    setIsReconnectingDiscord(true)
    try {
      if (window.api.reconnectDiscord) {
        const res = await window.api.reconnectDiscord()
        setDiscordStatus(res)
      }
    } catch {
      // ignore
    } finally {
      setIsReconnectingDiscord(false)
    }
  }

  if (!isOpen || !settings) return null

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true)
    setUpdateError(null)
    try {
      const info = await window.api.checkForUpdates()
      setUpdateInfo(info)
    } catch (err: any) {
      setUpdateError(err?.message || 'Failed to check for updates.')
    } finally {
      setCheckingUpdate(false)
    }
  }

  const handleDownloadAndInstall = async () => {
    if (!updateInfo || !updateInfo.downloadUrl) return
    setDownloadingUpdate(true)
    setUpdateError(null)
    try {
      const res = await window.api.downloadAndInstallUpdate(
        updateInfo.downloadUrl,
        updateInfo.assetName || undefined
      )
      if (!res.success) {
        setUpdateError(res.message || 'Failed to install update.')
        setDownloadingUpdate(false)
      }
    } catch (err: any) {
      setUpdateError(err?.message || 'Error occurred while updating.')
      setDownloadingUpdate(false)
    }
  }

  const handleCreateBackup = async () => {
    setBackingUp(true)
    try {
      const res = await window.api.createBackup()
      if (res.success && res.backupPath) {
        const filename = res.backupPath.replace(/\\/g, '/').split('/').pop()
        setBackupStatus(`Backup saved: ${filename}`)
      } else {
        setBackupStatus(res.error || 'Backup failed')
      }
    } catch (err: any) {
      setBackupStatus(err?.message || 'Backup failed')
    } finally {
      setBackingUp(false)
      setTimeout(() => setBackupStatus(null), 5000)
    }
  }

  const handleBrowseVlc = async () => {
    const selected = await window.api.selectVlcExecutable()
    if (selected) {
      setSettings((prev) => (prev ? { ...prev, vlcPath: selected } : null))
    }
  }

  const handleBrowseMpv = async () => {
    const selected = await window.api.selectMpvExecutable()
    if (selected) {
      setSettings((prev) => (prev ? { ...prev, mpvPath: selected } : null))
    }
  }

  const handleAutoDetectPlayers = async () => {
    setDetectStatus('Scanning system for players...')
    try {
      const detected = await window.api.detectPlayers()
      setSettings((prev) => {
        if (!prev) return null
        return {
          ...prev,
          vlcPath: detected.vlc || prev.vlcPath,
          mpvPath: detected.mpv || prev.mpvPath
        }
      })
      const found: string[] = []
      if (detected.vlc) found.push('VLC')
      if (detected.mpv) found.push('mpv')
      if (found.length > 0) {
        setDetectStatus(`Detected: ${found.join(' & ')}`)
      } else {
        setDetectStatus('No additional players found in default paths.')
      }
    } catch {
      setDetectStatus('Detection failed')
    }
    setTimeout(() => setDetectStatus(null), 3500)
  }

  const handleVerifyAniList = async () => {
    if (!tokenInput.trim()) return
    setValidatingToken(true)
    setTokenFeedback(null)
    try {
      const res = await window.api.validateAniListToken(tokenInput.trim())
      if (res.success && res.username) {
        setSettings((prev) =>
          prev
            ? {
                ...prev,
                aniListToken: tokenInput.trim(),
                aniListUsername: res.username,
                aniListAvatar: res.avatar
              }
            : null
        )
        setTokenFeedback(`Connected as ${res.username}!`)
      } else {
        setTokenFeedback(res.error || 'Invalid token')
      }
    } finally {
      setValidatingToken(false)
    }
  }

  const handleDisconnectAniList = () => {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            aniListToken: '',
            aniListUsername: undefined,
            aniListAvatar: undefined
          }
        : null
    )
    setTokenInput('')
    setTokenFeedback(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const toSave = { ...settings, aniListToken: tokenInput.trim() || undefined }
      const updated = await window.api.saveSettings(toSave)
      setSettings(updated)
      onSaved(updated)
      setSavedSuccess(true)
      setTimeout(() => {
        setSavedSuccess(false)
        onClose()
      }, 600)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl liquid-glass border border-white/10 shadow-2xl overflow-hidden backdrop-blur-2xl">
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-bifrost-amber/10 text-bifrost-amber">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Heimdall Settings</h2>
              <p className="text-xs text-zinc-400">VLC, Discord RPC, and AniList Integration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Dual Media Player Engine Section */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-surface-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-bifrost-amber/15 text-bifrost-amber">
                  <Play className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Media Player Engine
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Choose your primary media playback engine
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAutoDetectPlayers}
                className="px-2.5 py-1 text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-bifrost-amber" />
                Detect Players
              </button>
            </div>

            {detectStatus && (
              <div className="text-[11px] px-3 py-1.5 rounded-lg bg-bifrost-amber/10 border border-bifrost-amber/20 text-bifrost-amber animate-in fade-in">
                {detectStatus}
              </div>
            )}

            {/* Player Switcher Segmented Control */}
            <div className="grid grid-cols-2 gap-2 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800/80">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, preferredPlayer: 'vlc' })}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  (settings.preferredPlayer || 'vlc') === 'vlc'
                    ? 'bg-bifrost-amber text-zinc-950 shadow-md font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Shield className="w-4 h-4" />
                VLC Media Player
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, preferredPlayer: 'mpv' })}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  settings.preferredPlayer === 'mpv'
                    ? 'bg-cyan-500 text-zinc-950 shadow-md font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Zap className="w-4 h-4" />
                mpv Player
              </button>
            </div>

            {/* VLC Executable Path */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  VLC Executable Path
                </label>
                {(settings.preferredPlayer || 'vlc') === 'vlc' && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-bifrost-amber/15 text-bifrost-amber">
                    Active Primary
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.vlcPath}
                  onChange={(e) => setSettings({ ...settings, vlcPath: e.target.value })}
                  placeholder="C:\Program Files\VideoLAN\VLC\vlc.exe"
                  className="flex-1 px-3 py-1.5 text-xs bg-zinc-950 border border-surface-border rounded-xl text-zinc-200 focus:outline-none focus:border-bifrost-amber"
                />
                <button
                  type="button"
                  onClick={handleBrowseVlc}
                  className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-bifrost-amber" />
                  Browse
                </button>
              </div>
            </div>

            {/* mpv Executable Path */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  mpv Executable Path
                </label>
                {settings.preferredPlayer === 'mpv' && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400">
                    Active Primary
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.mpvPath || ''}
                  onChange={(e) => setSettings({ ...settings, mpvPath: e.target.value })}
                  placeholder="C:\Program Files\mpv\mpv.exe"
                  className="flex-1 px-3 py-1.5 text-xs bg-zinc-950 border border-surface-border rounded-xl text-zinc-200 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleBrowseMpv}
                  className="px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                  Browse
                </button>
              </div>
            </div>

            {/* mpv Anime4K & High-Quality Upscaling Subcard */}
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <div>
                    <h5 className="text-xs font-semibold text-zinc-200">
                      Anime4K & High-End Scaling (mpv)
                    </h5>
                    <p className="text-[10px] text-zinc-400">
                      GPU shader upscaling for razor-sharp anime line art and 4K displays
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableAnime4K ?? false}
                    onChange={(e) => setSettings({ ...settings, enableAnime4K: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              {settings.enableAnime4K && (
                <div className="space-y-2 pt-1 border-t border-zinc-800/60">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Upscaling Profile
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      {
                        id: 'hq_lanczos' as Anime4KPreset,
                        label: 'EWA-Lanczos HQ',
                        desc: 'Best for Movies & 1080p Anime'
                      },
                      {
                        id: 'anime4k' as Anime4KPreset,
                        label: 'Anime4K Shaders',
                        desc: 'Ultra sharp anime edges'
                      },
                      {
                        id: 'fast' as Anime4KPreset,
                        label: 'Fast / Low Power',
                        desc: 'Hardware accelerated'
                      }
                    ].map((preset) => {
                      const isSelected = (settings.anime4kPreset || 'hq_lanczos') === preset.id
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSettings({ ...settings, anime4kPreset: preset.id })}
                          className={`p-2 rounded-lg text-left border transition-all ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                              : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <div className="text-[11px] font-bold">{preset.label}</div>
                          <div className="text-[9px] text-zinc-500 leading-tight">{preset.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Custom mpv Arguments */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Custom mpv Arguments (Optional)
                </label>
                <input
                  type="text"
                  value={settings.mpvCustomArgs || ''}
                  onChange={(e) => setSettings({ ...settings, mpvCustomArgs: e.target.value })}
                  placeholder='e.g. --sub-font="Trebuchet MS" --volume=100'
                  className="w-full px-3 py-1 text-xs bg-zinc-950 border border-surface-border rounded-lg text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Completion Threshold */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Auto-Complete Threshold
              </label>
              <span className="text-xs font-bold text-bifrost-amber font-mono">
                {Math.round(settings.completionThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="0.99"
              step="0.01"
              value={settings.completionThreshold}
              onChange={(e) =>
                setSettings({ ...settings, completionThreshold: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-bifrost-amber"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Marks episode as Watched & triggers AniList scrobble once progress reaches this threshold.
            </p>
          </div>

          {/* Module 4: Smart Subtitle Preferences */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-surface-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                  <Languages className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Smart Subtitle Downloader
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    64KB hash matching, language aliases & audio auto-sync
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Preferred Subtitle Language
                </label>
                <select
                  value={settings.preferredSubtitleLanguage || 'en'}
                  onChange={(e) => setSettings({ ...settings, preferredSubtitleLanguage: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-zinc-950 border border-surface-border rounded-xl text-zinc-200 focus:outline-none focus:border-bifrost-amber"
                >
                  <option value="en">English (en)</option>
                  <option value="es">Spanish / Español (es)</option>
                  <option value="ja">Japanese / 日本語 (ja)</option>
                  <option value="fr">French / Français (fr)</option>
                  <option value="de">German / Deutsch (de)</option>
                  <option value="hi">Hindi / हिन्दी (hi)</option>
                  <option value="it">Italian / Italiano (it)</option>
                  <option value="pt">Portuguese (pt)</option>
                  <option value="zh">Chinese / 中文 (zh)</option>
                  <option value="ko">Korean / 한국어 (ko)</option>
                  <option value="ar">Arabic / العربية (ar)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  OpenSubtitles API Key (Optional)
                </label>
                <input
                  type="text"
                  value={settings.openSubtitlesApiKey || ''}
                  onChange={(e) => setSettings({ ...settings, openSubtitlesApiKey: e.target.value })}
                  placeholder="Custom VIP Key (Optional)"
                  className="w-full px-3 py-2 text-xs bg-zinc-950 border border-surface-border rounded-xl text-zinc-200 focus:outline-none focus:border-bifrost-amber font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
              <div>
                <span className="text-xs font-semibold text-zinc-200">Auto-Download Subtitles</span>
                <p className="text-[10px] text-zinc-500">
                  Automatically search and download missing subtitles on playback
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoDownloadSubtitles ?? false}
                  onChange={(e) => setSettings({ ...settings, autoDownloadSubtitles: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>

          {/* Feature 5: Discord Rich Presence */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-surface-border space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Discord Rich Presence
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Show &quot;Watching [Series] • Ep X&quot; on your Discord status
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableDiscordRPC}
                  onChange={(e) =>
                    setSettings({ ...settings, enableDiscordRPC: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
              </label>
            </div>

            {settings.enableDiscordRPC && (
              <div className="pt-2.5 border-t border-zinc-800/60 space-y-3">
                {/* Connection Status Badge */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/40 border border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        discordStatus?.isConnected
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                          : 'bg-zinc-500'
                      }`}
                    />
                    <span className="font-medium text-zinc-300">
                      {discordStatus?.isConnected
                        ? `Connected to Discord (${discordStatus.username || 'Active'})`
                        : 'Discord RPC Idle (Waiting for playback or Discord)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleReconnectDiscord}
                    disabled={isReconnectingDiscord}
                    className="px-2 py-1 rounded-md text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/30 transition-colors"
                  >
                    {isReconnectingDiscord ? 'Checking...' : 'Check / Reconnect'}
                  </button>
                </div>

                {/* Client ID Customization */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-300 flex items-center justify-between">
                    <span>Discord Application Client ID</span>
                    <span className="text-[10px] text-zinc-500">Default: 737663962677510245</span>
                  </label>
                  <input
                    type="text"
                    value={settings.discordClientId || ''}
                    placeholder="737663962677510245"
                    onChange={(e) =>
                      setSettings({ ...settings, discordClientId: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-surface-border rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <p className="text-[10px] text-zinc-500">
                    Heimdall automatically broadcasts title, episode number, playtime, and AniList poster to your Discord profile.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Feature 6: AniList Auto-Scrobble */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-surface-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    AniList Auto-Scrobbler
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Automatically sync completed episodes to your AniList profile
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableAniListScrobble}
                  onChange={(e) =>
                    setSettings({ ...settings, enableAniListScrobble: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500" />
              </label>
            </div>

            {settings.aniListUsername ? (
              <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settings.aniListAvatar ? (
                    <img
                      src={settings.aniListAvatar}
                      alt={settings.aniListUsername}
                      className="w-8 h-8 rounded-full border border-sky-500/40"
                    />
                  ) : (
                    <UserCheck className="w-5 h-5 text-sky-400" />
                  )}
                  <div>
                    <span className="text-xs font-bold text-zinc-100 block">
                      {settings.aniListUsername}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium">
                      ✓ Connected & Ready to Scrobble
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnectAniList}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Paste your AniList OAuth Token..."
                    className="flex-1 px-3 py-1.5 text-xs bg-zinc-900 border border-surface-border rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    disabled={validatingToken || !tokenInput.trim()}
                    onClick={handleVerifyAniList}
                    className="px-3 py-1.5 text-xs font-bold bg-sky-500 hover:bg-sky-400 text-zinc-950 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {validatingToken ? 'Checking...' : 'Connect'}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Need a token? Click to authorize in your browser:</span>
                  <a
                    href="https://anilist.co/api/v2/oauth/authorize?client_id=27521&response_type=token"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline flex items-center gap-1"
                  >
                    Get AniList Token <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {tokenFeedback && (
                  <p className="text-[11px] font-medium text-amber-400">{tokenFeedback}</p>
                )}
              </div>
            )}
          </div>

          {/* Feature 2: Thumbnails */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-bifrost-amber/15 text-bifrost-amber">
                <Film className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Video Preview Thumbnails
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Generate 16:9 local video frames for episode cards using bundled FFmpeg
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableThumbnails}
                onChange={(e) =>
                  setSettings({ ...settings, enableThumbnails: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-bifrost-amber" />
            </label>
          </div>

          {/* Feature 3: Liquid Glass UI */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Liquid Glass UI
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Translucent acrylic surfaces, ambient Bifrost light caustics, and specular edge reflections
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableLiquidGlass !== false}
                onChange={(e) =>
                  setSettings({ ...settings, enableLiquidGlass: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500" />
            </label>
          </div>

          {/* Section: Updates & Data Safety */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-surface-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-bifrost-amber/15 text-bifrost-amber">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Updates & Data Preservation
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Upgrade to latest Heimdall with 100% watch progress & library data retention
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={backingUp}
                  onClick={handleCreateBackup}
                  className="px-2.5 py-1 text-[11px] font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg flex items-center gap-1.5 transition-colors"
                  title="Create an instant JSON snapshot of all series, movies, and settings"
                >
                  <Archive className="w-3.5 h-3.5 text-zinc-400" />
                  {backingUp ? 'Backing up...' : 'Backup Library'}
                </button>

                <button
                  type="button"
                  disabled={checkingUpdate || downloadingUpdate}
                  onClick={handleCheckForUpdates}
                  className="px-2.5 py-1 text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-bifrost-amber ${checkingUpdate ? 'animate-spin' : ''}`} />
                  {checkingUpdate ? 'Checking...' : 'Check Updates'}
                </button>
              </div>
            </div>

            {backupStatus && (
              <div className="text-[11px] px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{backupStatus}</span>
              </div>
            )}

            {updateError && (
              <div className="text-[11px] px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{updateError}</span>
              </div>
            )}

            {/* When an update is detected */}
            {updateInfo?.hasUpdate ? (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-in fade-in">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-300">
                        Version {updateInfo.latestVersion} Available
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        New Update
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Current version: <span className="font-mono text-zinc-300">v{updateInfo.currentVersion}</span>
                      {updateInfo.releaseDate && ` • Released ${updateInfo.releaseDate}`}
                    </p>
                  </div>

                  {!downloadingUpdate && (
                    <button
                      type="button"
                      onClick={handleDownloadAndInstall}
                      className="px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg flex items-center gap-1.5 transition-colors shadow-md shadow-amber-500/20"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download & Update
                    </button>
                  )}
                </div>

                {/* Release notes */}
                {updateInfo.releaseNotes && (
                  <div className="text-[11px] text-zinc-300 bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800/80 max-h-24 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
                    {updateInfo.releaseNotes}
                  </div>
                )}

                {/* Download Progress */}
                {downloadingUpdate && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-amber-300 font-medium flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Downloading and preparing installer...
                      </span>
                      <span className="font-mono text-zinc-300">
                        {downloadProgress ? `${downloadProgress.percent}%` : 'Starting...'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-200"
                        style={{ width: `${downloadProgress?.percent || 0}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      Zero-Loss Guarantee: Your library and settings will be preserved through the update.
                    </p>
                  </div>
                )}
              </div>
            ) : updateInfo ? (
              <div className="text-[11px] px-3 py-2 rounded-lg bg-zinc-900/80 border border-surface-border text-zinc-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Heimdall is up to date (v{updateInfo.currentVersion})
                </span>
                <span className="text-[10px] text-emerald-400 font-medium">Safe & Synced</span>
              </div>
            ) : (
              <div className="text-[11px] px-3 py-2 rounded-lg bg-zinc-900/60 border border-surface-border text-zinc-400 flex items-center justify-between">
                <span>Current version: <span className="font-mono text-zinc-200 font-medium">v1.2.0</span></span>
                <span className="text-[10px] text-zinc-500">Auto-backup enabled</span>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold bg-bifrost-amber hover:bg-bifrost-glow text-zinc-950 rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-bifrost-amber/20 disabled:opacity-50"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
