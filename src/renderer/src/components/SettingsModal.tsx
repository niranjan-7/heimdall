import React, { useState, useEffect } from 'react'
import { AppSettings } from '../../../shared/types'
import { Settings, FolderOpen, Check, X, Shield, RefreshCw } from 'lucide-react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: (newSettings: AppSettings) => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      window.api.getSettings().then((s) => setSettings(s))
      setSavedSuccess(false)
    }
  }, [isOpen])

  if (!isOpen || !settings) return null

  const handleBrowseVlc = async () => {
    const selected = await window.api.selectVlcExecutable()
    if (selected) {
      setSettings((prev) => (prev ? { ...prev, vlcPath: selected } : null))
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await window.api.saveSettings(settings)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-surface-elevated border border-surface-border p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-bifrost-amber/10 text-bifrost-amber">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Heimdall Settings</h2>
              <p className="text-xs text-zinc-400">Configure VLC integration and telemetry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5 pt-5">
          {/* VLC Executable Path */}
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
                className="flex-1 px-3 py-2 text-sm bg-zinc-950 border border-surface-border rounded-lg text-zinc-200 focus:outline-none focus:border-bifrost-amber"
              />
              <button
                type="button"
                onClick={handleBrowseVlc}
                className="px-3.5 py-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-bifrost-amber" />
                Browse
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Standard: C:\Program Files\VideoLAN\VLC\vlc.exe
            </p>
          </div>

          {/* Completion Threshold */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Auto-Complete Threshold
              </label>
              <span className="text-xs font-bold text-bifrost-amber">
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
              Mark episode as "Watched" once playback reaches this percentage of the total duration.
            </p>
          </div>

          {/* HTTP Telemetry Port & Password */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                HTTP Port
              </label>
              <input
                type="number"
                value={settings.httpPort}
                onChange={(e) =>
                  setSettings({ ...settings, httpPort: parseInt(e.target.value) || 42120 })
                }
                className="w-full px-3 py-2 text-sm bg-zinc-950 border border-surface-border rounded-lg text-zinc-200 focus:outline-none focus:border-bifrost-amber"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                HTTP Secret
              </label>
              <input
                type="text"
                value={settings.httpPassword}
                onChange={(e) => setSettings({ ...settings, httpPassword: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-zinc-950 border border-surface-border rounded-lg text-zinc-200 focus:outline-none focus:border-bifrost-amber"
              />
            </div>
          </div>

          <div className="p-3 bg-zinc-950/60 rounded-xl border border-surface-border/50 text-[11px] text-zinc-400 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-bifrost-amber shrink-0 mt-0.5" />
            <span>
              Heimdall starts VLC with a local loopback HTTP interface (<code className="text-zinc-300">--extraintf=http</code>) to synchronize playback position in real-time.
            </span>
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
