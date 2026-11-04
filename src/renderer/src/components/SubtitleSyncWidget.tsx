import React, { useEffect, useState } from 'react'
import { SyncOutcome, SyncProgress, SyncReport, SyncTarget } from '../../../shared/types'
import {
  Zap,
  RotateCcw,
  Minus,
  Plus,
  Check,
  Loader2,
  Sparkles,
  Download,
  X,
  Undo2,
  AlertTriangle
} from 'lucide-react'

interface SubtitleSyncWidgetProps {
  target: SyncTarget
  subDelaySec?: number
  syncReport?: SyncReport
  syncedSubtitlePath?: string
  onNotification: (type: 'success' | 'info' | 'error', message: string) => void
  /** Called after anything that changes the library (delay, synced file). */
  onDelayUpdated: () => void
}

const CONFIDENCE_LABEL: Record<string, string> = { high: 'High', medium: 'Medium', low: 'Low' }

function formatDelay(sec: number): string {
  if (sec === 0) return '0.00s'
  return `${sec > 0 ? '+' : ''}${sec.toFixed(2)}s`
}

function describeReport(r: SyncReport): string {
  const parts: string[] = []
  if (Math.abs(r.offsetSec) >= 0.005) {
    parts.push(`${r.offsetSec > 0 ? '+' : '−'}${Math.abs(r.offsetSec).toFixed(2)} s`)
  }
  if (r.fpsChange) parts.push(r.fpsChange)
  return parts.join(', ') || 'no change'
}

export const SubtitleSyncWidget: React.FC<SubtitleSyncWidgetProps> = ({
  target,
  subDelaySec,
  syncReport,
  syncedSubtitlePath,
  onNotification,
  onDelayUpdated
}) => {
  const isEpisode = target.kind === 'episode'
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [applyToSeason, setApplyToSeason] = useState(false)
  const [currentDelay, setCurrentDelay] = useState<number>(subDelaySec || 0)
  // A result that needs the user: confirm, or explain why nothing changed.
  const [card, setCard] = useState<SyncOutcome | null>(null)

  const targetKey = target.kind === 'movie' ? target.movieId : target.episodeId
  useEffect(() => {
    setCurrentDelay(subDelaySec || 0)
    setCard(null)
  }, [targetKey, subDelaySec])

  useEffect(() => window.api.onSubtitleSyncProgress((p) => setProgress(p)), [])

  /** Shows a finished sync: a notification when it's done, a card when the user has a choice. */
  const showOutcome = (res: SyncOutcome, prefix = ''): void => {
    const message = prefix + res.message
    switch (res.status) {
      case 'applied':
        setCurrentDelay(0)
        setCard(null)
        onNotification('success', message)
        onDelayUpdated()
        break
      case 'already-in-sync':
        setCard(null)
        onNotification('info', message)
        break
      case 'cancelled':
        setCard(null)
        onNotification('info', message)
        break
      case 'error':
        setCard(null)
        onNotification('error', message)
        break
      default:
        setCard({ ...res, message }) // needs-confirmation, refused, no-subtitle
    }
  }

  const runSync = async (allowEmbedded = false): Promise<void> => {
    setIsSyncing(true)
    setProgress(null)
    setCard(null)
    try {
      showOutcome(await window.api.runSubtitleSync(target, { allowEmbedded }))
    } catch (err) {
      onNotification('error', (err as Error)?.message || 'Auto-sync failed')
    } finally {
      setIsSyncing(false)
      setProgress(null)
    }
  }

  const handleDownloadSubtitle = async (): Promise<void> => {
    setIsDownloading(true)
    setCard(null)
    try {
      const res =
        target.kind === 'movie'
          ? await window.api.downloadMovieSubtitle(target.movieId)
          : await window.api.downloadSubtitle(target.seriesId, target.episodeId)
      if (!res.success) {
        onNotification('info', res.message)
      } else if (res.sync && res.sync.status === 'needs-confirmation') {
        showOutcome(res.sync, 'Subtitle downloaded. ')
        onDelayUpdated()
      } else {
        if (res.sync?.status === 'applied') setCurrentDelay(0)
        onNotification('success', res.message)
        onDelayUpdated()
      }
    } catch (err) {
      onNotification('error', (err as Error)?.message || 'Subtitle download failed')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleConfirm = async (): Promise<void> => {
    if (!card?.pendingId) return
    showOutcome(await window.api.applySubtitleSync(card.pendingId))
  }

  const handleDiscard = async (): Promise<void> => {
    if (card?.pendingId) await window.api.discardSubtitleSync(card.pendingId)
    setCard(null)
  }

  const handleUndo = async (): Promise<void> => {
    const res = await window.api.undoSubtitleSync(target)
    onNotification(res.status === 'error' ? 'error' : 'info', res.message)
    onDelayUpdated()
  }

  const handleNudge = async (deltaSec: number): Promise<void> => {
    try {
      const res =
        target.kind === 'movie'
          ? await window.api.nudgeMovieSubtitleDelay(target.movieId, deltaSec)
          : await window.api.nudgeSubtitleDelay(
              target.seriesId,
              target.episodeId,
              deltaSec,
              applyToSeason
            )
      setCurrentDelay(res.currentDelay)
      onDelayUpdated()
    } catch (err) {
      onNotification('error', (err as Error)?.message || 'Failed to adjust delay')
    }
  }

  const handleReset = async (): Promise<void> => {
    try {
      if (target.kind === 'movie') await window.api.resetMovieSubtitleDelay(target.movieId)
      else await window.api.resetSubtitleDelay(target.seriesId, target.episodeId)
      setCurrentDelay(0)
      onNotification('info', 'Subtitle delay reset to 0.0s')
      onDelayUpdated()
    } catch (err) {
      onNotification('error', (err as Error)?.message || 'Failed to reset delay')
    }
  }

  const progressText = !progress
    ? 'Starting…'
    : progress.stage === 'audio'
      ? `Reading audio ${Math.round(progress.fraction * 100)}%`
      : 'Matching subtitles…'

  const busy = isSyncing || isDownloading

  return (
    <div className="p-3 liquid-glass-subtle border border-white/10 rounded-xl backdrop-blur-xl shadow-lg space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-bifrost-amber/15 text-bifrost-amber">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Subtitle Sync
              </span>
              <span
                title="Manual delay on top of the subtitle timing"
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                  currentDelay !== 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {formatDelay(currentDelay)}
              </span>
            </div>
            {syncedSubtitlePath && syncReport ? (
              <p className="text-xs text-emerald-300/90 flex items-center gap-1.5">
                <Check className="w-3 h-3" />
                Synced ({describeReport(syncReport)}, {CONFIDENCE_LABEL[syncReport.confidence]}{' '}
                confidence)
                <button
                  type="button"
                  onClick={handleUndo}
                  className="ml-1 inline-flex items-center gap-0.5 text-zinc-400 hover:text-zinc-200 underline-offset-2 hover:underline"
                >
                  <Undo2 className="w-3 h-3" />
                  Undo
                </button>
              </p>
            ) : (
              <p className="text-xs text-zinc-400">
                Matches subtitle timing to the speech in the audio
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-zinc-900 border border-surface-border rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => handleNudge(-0.1)}
              title="Show subtitles 0.1 s earlier"
              className="px-2 py-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded flex items-center gap-0.5 transition-colors font-mono"
            >
              <Minus className="w-3 h-3" />
              0.1s
            </button>
            <div className="w-px h-4 bg-zinc-800" />
            <button
              type="button"
              onClick={() => handleNudge(0.1)}
              title="Show subtitles 0.1 s later"
              className="px-2 py-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded flex items-center gap-0.5 transition-colors font-mono"
            >
              <Plus className="w-3 h-3" />
              0.1s
            </button>
          </div>

          {currentDelay !== 0 && (
            <button
              type="button"
              onClick={handleReset}
              title="Reset the manual delay to 0"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {isSyncing ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-surface-border text-xs text-zinc-200 flex items-center gap-1.5 font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-bifrost-amber" />
                {progressText}
              </span>
              <button
                type="button"
                onClick={() => window.api.cancelSubtitleSync()}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => runSync(false)}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-bifrost-amber hover:from-amber-400 hover:to-bifrost-amber text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-bifrost-amber/20 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Sync to Audio</span>
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={handleDownloadSubtitle}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-700/50 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            title="Find a subtitle for this exact file on OpenSubtitles, then auto-sync it"
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

          {isEpisode && (
            <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none ml-1">
              <input
                type="checkbox"
                checked={applyToSeason}
                onChange={(e) => setApplyToSeason(e.target.checked)}
                className="w-3.5 h-3.5 accent-bifrost-amber rounded bg-zinc-900 border-zinc-700"
              />
              <span title="Nudges apply to every episode in this season">Nudge whole season</span>
            </label>
          )}
        </div>
      </div>

      {card && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs ${
            card.status === 'needs-confirmation'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-100'
              : 'bg-zinc-900/80 border-surface-border text-zinc-300'
          }`}
        >
          <span className="flex items-start gap-1.5">
            {card.status === 'needs-confirmation' ? (
              <Sparkles className="w-3.5 h-3.5 mt-px text-amber-300 shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 mt-px text-zinc-400 shrink-0" />
            )}
            {card.message}
          </span>
          <span className="flex items-center gap-1.5">
            {card.status === 'needs-confirmation' && (
              <button
                type="button"
                onClick={handleConfirm}
                className="px-2.5 py-1 rounded-md bg-bifrost-amber text-zinc-950 font-bold"
              >
                Apply
              </button>
            )}
            {card.status === 'no-subtitle' && card.embeddedAvailable && (
              <button
                type="button"
                onClick={() => runSync(true)}
                className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              >
                Sync built-in track anyway
              </button>
            )}
            <button
              type="button"
              onClick={handleDiscard}
              title="Dismiss"
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      )}
    </div>
  )
}
