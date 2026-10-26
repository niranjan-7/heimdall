import React, { useState, useEffect } from 'react'
import { AppSettings } from '../../../shared/types'
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
  UserCheck
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

  useEffect(() => {
    if (isOpen) {
      window.api.getSettings().then((s) => {
        setSettings(s)
        setTokenInput(s.aniListToken || '')
      })
      setSavedSuccess(false)
      setTokenFeedback(null)
    }
  }, [isOpen])

  if (!isOpen || !settings) return null

  const handleBrowseVlc = async () => {
    const selected = await window.api.selectVlcExecutable()
    if (selected) {
      setSettings((prev) => (prev ? { ...prev, vlcPath: selected } : null))
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-surface-elevated border border-surface-border shadow-2xl overflow-hidden">
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
          {/* VLC Path */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
              VLC Executable Path (`vlc.exe`)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.vlcPath}
                onChange={(e) => setSettings({ ...settings, vlcPath: e.target.value })}
                placeholder="C:\Program Files\VideoLAN\VLC\vlc.exe"
                className="flex-1 px-3 py-2 text-sm bg-zinc-950 border border-surface-border rounded-xl text-zinc-200 focus:outline-none focus:border-bifrost-amber"
              />
              <button
                type="button"
                onClick={handleBrowseVlc}
                className="px-3.5 py-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-bifrost-amber" />
                Browse
              </button>
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

          {/* Feature 5: Discord Rich Presence */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-surface-border space-y-3">
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
