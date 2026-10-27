import React, { useState } from 'react'
import { Series, Episode, VlcStateUpdate } from '../../../shared/types'
import { formatTime } from '../utils/formatters'
import { SubtitleSyncWidget } from './SubtitleSyncWidget'
import {
  Play,
  SkipForward,
  FolderPlus,
  RefreshCw,
  Trash2,
  Tv,
  Radio,
  Clock,
  Sparkles
} from 'lucide-react'

interface HeroBannerProps {
  series: Series
  activeVlcState: VlcStateUpdate | null
  onPlayResume: () => void
  onPlayNext: () => void
  onAddSeason: () => void
  onRescan: () => void
  onDeleteSeries: () => void
  onOpenAniListSearch: () => void
  onNotification: (type: 'success' | 'info' | 'error', message: string) => void
  onDelayUpdated: () => void
  onSeriesUpdated?: (updatedSeries: Series) => void
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  series,
  activeVlcState,
  onPlayResume,
  onPlayNext,
  onAddSeason,
  onRescan,
  onDeleteSeries,
  onOpenAniListSearch,
  onNotification,
  onDelayUpdated,
  onSeriesUpdated
}) => {
  const [syncingAniList, setSyncingAniList] = useState(false)

  const handleSyncToAniList = async () => {
    if (syncingAniList) return
    setSyncingAniList(true)
    try {
      const res = await window.api.syncSeriesToAniList(series.id)
      if (!res.success && res.message) {
        onNotification('error', res.message)
      }
    } catch (err: any) {
      onNotification('error', err?.message || 'Failed to sync to AniList')
    } finally {
      setSyncingAniList(false)
    }
  }

  const handleCleanTitles = async () => {
    try {
      const updated = await window.api.batchNormalizeEpisodeTitles(series.id)
      if (updated && onSeriesUpdated) {
        onSeriesUpdated(updated)
      }
      onNotification('success', `Normalized episode titles for ${series.aniListTitle || series.title}`)
    } catch {
      onNotification('error', 'Failed to normalize titles')
    }
  }
  // Find current resume episode
  let resumeEpisode: Episode | undefined
  if (series.lastActiveEpisodeId) {
    resumeEpisode = series.episodes.find((e) => e.id === series.lastActiveEpisodeId)
  }
  if (!resumeEpisode && series.episodes.length > 0) {
    resumeEpisode = series.episodes.find((e) => !e.completed) || series.episodes[0]
  }

  const resumeIndex = resumeEpisode
    ? series.episodes.findIndex((e) => e.id === resumeEpisode!.id)
    : 0
  const nextEpisode =
    resumeIndex >= 0 && resumeIndex + 1 < series.episodes.length
      ? series.episodes[resumeIndex + 1]
      : null

  const totalEpisodes = series.episodes.length
  const completedEpisodes = series.episodes.filter((e) => e.completed).length
  const completionPercent =
    totalEpisodes > 0 ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0

  const isPlayingThisSeries =
    activeVlcState?.isRunning && activeVlcState?.seriesId === series.id

  const isCurrentEpAlmostDone =
    resumeEpisode &&
    (resumeEpisode.completed ||
      (resumeEpisode.durationSec > 0 &&
        resumeEpisode.timeSec / resumeEpisode.durationSec >= 0.85))

  return (
    <div className="relative overflow-hidden rounded-2xl liquid-glass p-6 shadow-2xl mb-6 space-y-5">
      {/* Background Banner Backdrop if linked to AniList */}
      {series.bannerImage && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15 filter blur-[2px] pointer-events-none"
          style={{ backgroundImage: `url(${series.bannerImage})` }}
        />
      )}

      {/* Ambient glows */}
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-bifrost-amber/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Column: Cover Art + Info */}
        <div className="flex items-start gap-5 max-w-2xl">
          {/* AniList Cover Poster */}
          {series.coverImage && (
            <div className="relative shrink-0 hidden sm:block">
              <img
                src={series.coverImage}
                alt={series.aniListTitle || series.title}
                className="w-24 h-36 object-cover rounded-xl border border-surface-border shadow-xl ring-1 ring-white/10"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-bifrost-amber/15 text-bifrost-amber border border-bifrost-amber/30 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5" />
                Series
              </span>

              {isPlayingThisSeries && (
                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 animate-pulse">
                  <Radio className="w-3.5 h-3.5" />
                  {activeVlcState?.playerType === 'mpv' ? 'mpv Active' : 'VLC Active'}
                </span>
              )}

              {series.aniListId ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AniList Linked
                </span>
              ) : null}

              <span className="text-xs text-zinc-400 font-mono">
                {completedEpisodes} of {totalEpisodes} watched ({completionPercent}%)
              </span>
            </div>

            <h2 className="text-2xl lg:text-3xl font-black text-zinc-100 tracking-tight leading-tight">
              {series.aniListTitle || series.title}
            </h2>

            <p
              className="text-xs text-zinc-400 font-mono truncate max-w-lg"
              title={series.rootPath}
            >
              {series.rootPath}
            </p>

            {/* Action buttons row */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                onClick={onOpenAniListSearch}
                className="px-3 py-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900/60 text-sky-200 border border-sky-800/50 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                {series.aniListId ? 'Match / Change AniList' : 'Match AniList'}
              </button>

              {series.aniListId ? (
                <button
                  onClick={handleSyncToAniList}
                  disabled={syncingAniList}
                  title="Force scrobble completed watch progress to your connected AniList account"
                  className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 hover:text-sky-100 border border-sky-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${syncingAniList ? 'animate-spin' : ''}`} />
                  {syncingAniList ? 'Syncing...' : 'Sync to AniList'}
                </button>
              ) : null}

              <button
                onClick={onAddSeason}
                className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 border border-zinc-700/60 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5 text-bifrost-amber" />
                + Add Season
              </button>

              <button
                onClick={onRescan}
                title="Rescan folders for newly added episodes"
                className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 border border-zinc-700/60 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                Rescan
              </button>

              <button
                onClick={handleCleanTitles}
                title="Normalize all episode titles in this series into clean 'Episode X' format"
                className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 border border-zinc-700/60 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-bifrost-amber" />
                Clean Titles
              </button>

              <button
                onClick={onDeleteSeries}
                title="Remove series from Heimdall"
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800/40 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-transparent hover:border-red-900/40 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Hero Resume CTA */}
        {resumeEpisode && (
          <div className="shrink-0 liquid-glass-subtle border border-white/10 rounded-xl p-4 md:w-80 space-y-3 shadow-lg">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-bifrost-amber flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Up Next / Left Off
              </span>
              <span className="font-mono text-zinc-400">
                {formatTime(resumeEpisode.timeSec)} / {formatTime(resumeEpisode.durationSec)}
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-zinc-100 truncate" title={resumeEpisode.title}>
                {resumeEpisode.seasonName} • Ep {resumeEpisode.episodeNumber ?? (resumeIndex + 1)}
              </div>
              <div
                className="text-xs text-zinc-400 truncate font-mono mt-0.5"
                title={resumeEpisode.fileName}
              >
                {resumeEpisode.fileName}
              </div>
            </div>

            {/* Primary Continue Watching Button */}
            <button
              onClick={onPlayResume}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-bifrost-amber to-amber-600 hover:from-amber-400 hover:to-bifrost-amber text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-bifrost-amber/25 transition-all active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-zinc-950" />
              <span>
                {resumeEpisode.timeSec > 0
                  ? `Continue Watching (${formatTime(resumeEpisode.timeSec)})`
                  : 'Start Watching in VLC'}
              </span>
            </button>

            {/* Secondary Play Next Button if current is >85% done */}
            {isCurrentEpAlmostDone && nextEpisode && (
              <button
                onClick={onPlayNext}
                className="w-full py-2 px-3 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-zinc-700"
              >
                <SkipForward className="w-3.5 h-3.5 text-bifrost-amber" />
                <span>
                  Play Next (Ep {nextEpisode.episodeNumber ?? resumeIndex + 2}) from 0:00
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Module 1: Subtitle Sync Engine Widget */}
      {resumeEpisode && (
        <div className="relative z-10 pt-1">
          <SubtitleSyncWidget
            series={series}
            activeEpisode={resumeEpisode}
            onNotification={onNotification}
            onDelayUpdated={onDelayUpdated}
          />
        </div>
      )}
    </div>
  )
}
