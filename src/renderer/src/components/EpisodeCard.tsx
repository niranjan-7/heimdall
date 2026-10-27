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
          ? 'liquid-glass-selected ring-2 ring-amber-400/50 shadow-xl shadow-amber-500/20'
          : isCurrentPlaying
            ? 'liquid-glass border-amber-500/70 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/20'
            : episode.completed
              ? 'liquid-glass-card opacity-75 hover:opacity-100 hover:border-white/20'
              : 'liquid-glass-card'
      }`}
    >
      {/* 16:9 Thumbnail Banner */}
      <div className="relative w-full h-32 sm:h-36 bg-black/40 backdrop-blur-md overflow-hidden flex items-center justify-center border-b border-white/5">
        {!thumbError ? (
          <img
            src={thumbUrl}
            alt={episode.title}
            onError={() => setThumbError(true)}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-white/[0.04] to-black/30 text-zinc-500">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center mb-1.5 shadow-inner">
              <Film className="w-5 h-5 text-amber-400/80 group-hover:text-amber-300 transition-colors" />
            </div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 font-semibold">
              Heimdall Frame
            </span>
          </div>
        )}

        {/* Gradient shadow overlay over thumbnail */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/50 pointer-events-none" />

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
                    : 'bg-black/80 border border-zinc-600 hover:border-bifrost-amber'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            )}

            <span
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold tracking-tight shadow-md backdrop-blur-md ${
                isCurrentPlaying
                  ? 'bg-bifrost-amber text-zinc-950 font-black'
                  : episode.completed
                    ? 'bg-white/10 text-zinc-400 border border-white/10'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
              }`}
            >
              EP {episode.episodeNumber ?? '?'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isCurrentPlaying && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/90 text-zinc-950 font-black text-[10px] tracking-wide animate-pulse shadow-md">
                <Radio className="w-3 h-3 stroke-[3]" />
                NOW PLAYING
              </span>
            )}

            {!isSelectionMode && (
              <button
                type="button"
                onClick={(e) => onToggleWatched(episode.id, e)}
                title={episode.completed ? 'Mark as unwatched' : 'Mark as watched'}
                className={`p-1.5 rounded-lg shadow-md transition-colors ${
                  episode.completed
                    ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
                    : 'bg-black/70 backdrop-blur-sm text-zinc-300 hover:text-white hover:bg-black/90 border border-zinc-700/60'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            )}
          </div>
        </div>

        {/* Duration badge on bottom right of thumbnail */}
        <div className="absolute bottom-2 right-2.5 z-10">
          <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-mono text-zinc-300 border border-white/10 shadow-sm">
            {episode.durationSec > 0
              ? `${formatTime(episode.timeSec)} / ${formatTime(episode.durationSec)}`
              : episode.timeSec > 0
                ? formatTime(episode.timeSec)
                : '00:00'}
          </span>
        </div>

        {/* Hover Center Play Button (Only when not in selection mode) */}
        {!isSelectionMode && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[1px]">
            <div className="w-11 h-11 rounded-full bg-bifrost-amber text-zinc-950 flex items-center justify-center shadow-xl shadow-bifrost-amber/30 transform group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-zinc-950 ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Card Info Section */}
      <div className="p-3.5 space-y-1.5 bg-black/20 backdrop-blur-sm">
        <h4
          className={`text-sm font-bold line-clamp-1 group-hover:text-amber-300 transition-colors ${
            episode.completed ? 'text-zinc-400 line-through' : 'text-zinc-100'
          }`}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          title={episode.title}
        >
          {episode.title}
        </h4>

        <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
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
                className="opacity-0 group-hover:opacity-100 hover:text-zinc-300 transition-opacity p-0.5"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar along bottom edge */}
      <div className="w-full h-1.5 bg-black/40 overflow-hidden relative border-t border-white/5">
        <div
          className={`h-full transition-all duration-300 ${
            episode.completed
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
              : progressPercent > 0
                ? 'bg-gradient-to-r from-amber-600 via-amber-400 to-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                : 'bg-transparent'
          }`}
          style={{ width: episode.completed ? '100%' : `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}
