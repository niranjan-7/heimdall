import React, { useState } from 'react'
import { Episode } from '../../../shared/types'
import { formatTime, formatRelativeTime, calculateProgress } from '../utils/formatters'
import { Play, Check, RotateCcw, Radio, Film } from 'lucide-react'

interface EpisodeCardProps {
  episode: Episode
  isCurrentPlaying: boolean
  isSelectionMode?: boolean
  isSelected?: boolean
  onPlay: (episodeId: string) => void
  onToggleWatched: (episodeId: string, e: React.MouseEvent) => void
  onResetProgress: (episodeId: string, e: React.MouseEvent) => void
  onToggleSelect?: (episodeId: string, e: React.MouseEvent) => void
}

export const EpisodeCard: React.FC<EpisodeCardProps> = ({
  episode,
  isCurrentPlaying,
  isSelectionMode = false,
  isSelected = false,
  onPlay,
  onToggleWatched,
  onResetProgress,
  onToggleSelect
}) => {
  const [thumbError, setThumbError] = useState(false)
  const progressPercent = calculateProgress(episode.timeSec, episode.durationSec)
  const relativeWatched = formatRelativeTime(episode.lastWatchedAt)

  const thumbUrl = `heimdall-thumb:///${encodeURIComponent(episode.id)}`

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect(episode.id, e)
    } else {
      onPlay(episode.id)
    }
  }

  return (
    <div
      onClick={handleCardClick}
      className={`group relative rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between ${
        isSelected
          ? 'liquid-glass-selected ring-2 ring-amber-400/70 shadow-2xl shadow-amber-500/30'
          : isCurrentPlaying
            ? 'liquid-glass border-amber-500/70 ring-1 ring-amber-500/50 shadow-xl shadow-amber-500/25'
            : episode.completed
              ? 'liquid-glass-card opacity-80 hover:opacity-100 hover:border-white/30'
              : 'liquid-glass-card hover:border-amber-500/50'
      }`}
    >
      {/* Specular Liquid Edge Sheen (Top & Bottom) */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none z-20" />

      {/* 16:9 Thumbnail Banner */}
      <div className="relative w-full h-32 sm:h-36 bg-black/25 backdrop-blur-md overflow-hidden flex items-center justify-center border-b border-white/10">
        {!thumbError ? (
          <img
            src={thumbUrl}
            alt={episode.title}
            onError={() => setThumbError(true)}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-white/[0.06] to-black/20 text-zinc-400">
            <div className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/15 flex items-center justify-center mb-1.5 shadow-inner">
              <Film className="w-5 h-5 text-amber-400 group-hover:text-amber-300 transition-colors" />
            </div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-300 font-bold">
              Heimdall Frame
            </span>
          </div>
        )}

        {/* Liquid gradient shadow overlay over thumbnail */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/40 pointer-events-none" />

        {/* Top Badges (Select Checkbox, Ep Number & Watched Toggle) */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 z-10">
          <div className="flex items-center gap-1.5">
            {/* Multi-Select Checkbox */}
            {(isSelectionMode || isSelected) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleSelect?.(episode.id, e)
                }}
                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-bifrost-amber text-zinc-950 shadow-md font-bold'
                    : 'bg-black/60 border border-zinc-400 hover:border-bifrost-amber backdrop-blur-md'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            )}

            <span
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold tracking-tight shadow-md backdrop-blur-md ${
                isCurrentPlaying
                  ? 'bg-bifrost-amber text-zinc-950 font-black shadow-amber-500/40 ring-1 ring-amber-300/50'
                  : episode.completed
                    ? 'bg-white/10 text-zinc-300 border border-white/15'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-inner'
              }`}
            >
              EP {episode.episodeNumber ?? '?'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isCurrentPlaying && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-400 text-zinc-950 font-black text-[10px] tracking-wide animate-pulse shadow-lg shadow-emerald-500/30">
                <Radio className="w-3 h-3 stroke-[3]" />
                PLAYING
              </span>
            )}

            {!isSelectionMode && (
              <button
                type="button"
                onClick={(e) => onToggleWatched(episode.id, e)}
                title={episode.completed ? 'Mark as unwatched' : 'Mark as watched'}
                className={`p-1.5 rounded-lg shadow-md transition-all ${
                  episode.completed
                    ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 ring-1 ring-emerald-300/50'
                    : 'bg-black/50 backdrop-blur-md text-zinc-300 hover:text-white hover:bg-black/80 border border-white/20'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            )}
          </div>
        </div>

        {/* Duration badge on bottom right of thumbnail */}
        <div className="absolute bottom-2 right-2.5 z-10">
          <span className="px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-md text-[10px] font-mono text-zinc-200 border border-white/15 shadow-sm font-semibold">
            {episode.durationSec > 0
              ? `${formatTime(episode.timeSec)} / ${formatTime(episode.durationSec)}`
              : episode.timeSec > 0
                ? formatTime(episode.timeSec)
                : '00:00'}
          </span>
        </div>

        {/* Hover Center Play Button (Only when not in selection mode) */}
        {!isSelectionMode && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/25 backdrop-blur-[1px]">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-zinc-950 flex items-center justify-center shadow-xl shadow-amber-500/40 ring-2 ring-white/30 transform group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-zinc-950 ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Card Info Section */}
      <div className="p-3.5 space-y-1.5 bg-black/15 backdrop-blur-md">
        <h4
          className={`text-sm font-bold line-clamp-1 group-hover:text-amber-300 transition-colors ${
            episode.completed ? 'text-zinc-400 line-through' : 'text-zinc-100'
          }`}
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
          title={episode.title}
        >
          {episode.title}
        </h4>

        <div className="flex items-center justify-between text-xs text-zinc-300 font-mono">
          <span className="truncate max-w-[150px] text-[11px] text-zinc-400" title={episode.fileName}>
            {episode.seasonName !== 'All Episodes' ? episode.seasonName : episode.fileName}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            {relativeWatched && (
              <span className="text-[10px] text-zinc-400">{relativeWatched}</span>
            )}
            {episode.timeSec > 0 && !isSelectionMode && (
              <button
                type="button"
                onClick={(e) => onResetProgress(episode.id, e)}
                title="Reset progress to 0:00"
                className="opacity-0 group-hover:opacity-100 hover:text-amber-300 transition-opacity p-0.5"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar along bottom edge */}
      <div className="w-full h-1.5 bg-black/40 overflow-hidden relative border-t border-white/10">
        <div
          className={`h-full transition-all duration-300 ${
            episode.completed
              ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]'
              : progressPercent > 0
                ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.7)]'
                : 'bg-transparent'
          }`}
          style={{ width: episode.completed ? '100%' : `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}
