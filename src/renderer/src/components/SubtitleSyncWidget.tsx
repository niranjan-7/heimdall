import React, { useState } from 'react'
import { Series, Episode } from '../../../shared/types'
import { Zap, RotateCcw, Minus, Plus, Check, Loader2, Sparkles, Download } from 'lucide-react'

interface SubtitleSyncWidgetProps {
  series: Series
  activeEpisode: Episode
  onNotification: (type: 'success' | 'info' | 'error', message: string) => void
  onDelayUpdated: () => void
}

export const SubtitleSyncWidget: React.FC<SubtitleSyncWidgetProps> = ({
  series,
  activeEpisode,
  onNotification,
  onDelayUpdated
}) => {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [applyToSeason, setApplyToSeason] = useState(false)
  const [currentDelay, setCurrentDelay] = useState<number>(activeEpisode.subDelaySec || 0)

  const handleDownloadSubtitle = async () => {
    setIsDownloading(true)
    try {
      const res = await window.api.downloadSubtitle(series.id, activeEpisode.id)
      if (res.success) {
        if (res.offsetApplied !== undefined) {
          setCurrentDelay(res.offsetApplied)
        }
        onNotification('success', res.message)
        onDelayUpdated()
      } else {
        onNotification('info', res.message)
      }
    } catch (err: any) {
      onNotification('error', err?.message || 'Subtitle download failed')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleAutoSync = async () => {
    setIsSyncing(true)
    try {
      const res = await window.api.autoSyncSubtitle(series.id, activeEpisode.id)
      if (res.success) {
        setCurrentDelay(res.offsetSec)
        onNotification('success', res.message)
        onDelayUpdated()
      } else {
        onNotification('error', res.message)
      }
    } catch (err: any) {
      onNotification('error', err.message || 'Auto-sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleNudge = async (deltaSec: number) => {
    try {
      const res = await window.api.nudgeSubtitleDelay(
        series.id,
        activeEpisode.id,
        deltaSec,
        applyToSeason
      )
      setCurrentDelay(res.currentDelay)
      onDelayUpdated()
    } catch (err: any) {
      onNotification('error', err.message || 'Failed to adjust delay')
    }
  }

  const handleReset = async () => {
    try {
      await window.api.resetSubtitleDelay(series.id, activeEpisode.id)
      setCurrentDelay(0)
      onNotification('info', 'Subtitle delay reset to 0.0s')
      onDelayUpdated()
    } catch (err: any) {
      onNotification('error', err.message || 'Failed to reset delay')
    }
  }

  const formatDelay = (sec: number) => {
    if (sec === 0) return '0.00s'
    const sign = sec > 0 ? '+' : ''
    return `${sign}${sec.toFixed(2)}s`
  }

  return (
    <div className="p-3 liquid-glass-subtle border border-white/10 rounded-xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-bifrost-amber/15 text-bifrost-amber">
          <Zap className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Subtitle Sync Engine
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                currentDelay !== 0
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {formatDelay(currentDelay)}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400">
            Real-time audio speech analysis & offset alignment
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Nudge Buttons */}
        <div className="flex items-center bg-zinc-900 border border-surface-border rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => handleNudge(-0.1)}
            title="Nudge subtitle 100ms earlier (-0.1s)"
            className="px-2 py-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded flex items-center gap-0.5 transition-colors font-mono"
          >
            <Minus className="w-3 h-3" />
            0.1s
          </button>
          <div className="w-px h-4 bg-zinc-800" />
          <button
            type="button"
            onClick={() => handleNudge(0.1)}
            title="Nudge subtitle 100ms later (+0.1s)"
            className="px-2 py-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded flex items-center gap-0.5 transition-colors font-mono"
          >
            <Plus className="w-3 h-3" />
            0.1s
          </button>
        </div>

        {/* Reset button */}
        {currentDelay !== 0 && (
          <button
            type="button"
            onClick={handleReset}
            title="Reset subtitle offset to 0"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Auto-Sync Button */}
        <button
          type="button"
          disabled={isSyncing || isDownloading}
          onClick={handleAutoSync}
          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-bifrost-amber hover:from-amber-400 hover:to-bifrost-amber text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-bifrost-amber/20 transition-all disabled:opacity-50"
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing Audio...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Sync to Audio</span>
            </>
          )}
        </button>

        {/* Download Subtitle Button */}
        <button
          type="button"
          disabled={isDownloading || isSyncing}
          onClick={handleDownloadSubtitle}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-700/50 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
          title="Download exact subtitle by 64KB hash or clean title & auto-sync"
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Fetching Subtitle...</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Download Subtitle</span>
            </>
          )}
        </button>

        {/* Apply to Season Toggle */}
        <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer select-none ml-1">
          <input
            type="checkbox"
            checked={applyToSeason}
            onChange={(e) => setApplyToSeason(e.target.checked)}
            className="w-3.5 h-3.5 accent-bifrost-amber rounded bg-zinc-900 border-zinc-700"
          />
          <span>Apply to season</span>
        </label>
      </div>
    </div>
  )
}
