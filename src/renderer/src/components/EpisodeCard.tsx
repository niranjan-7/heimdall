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
      className={`group relative rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between ${
        isSelected
          ? 'liquid-glass border-bifrost-amber ring-2 ring-bifrost-amber shadow-xl shadow-bifrost-amber/25'
          : isCurrentPlaying
            ? 'liquid-glass border-bifrost-amber ring-1 ring-bifrost-amber/50 shadow-lg shadow-bifrost-amber/15'
            : episode.completed
              ? 'liquid-glass-subtle hover:border-zinc-600'
              : 'liquid-glass-interactive'
      }`}
    >
      {/* 16:9 Thumbnail Banner */}
      <div className="relative w-full h-32 sm:h-36 bg-zinc-950 overflow-hidden flex items-center justify-center">
        {!thumbError ? (
          <img
            src={thumbUrl}
            alt={episode.title}
            onError={() => setThumbError(true)}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950 text-zinc-600">
            <Film className="w-8 h-8 stroke-1 mb-1 text-zinc-700" />
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-600">
              Heimdall Frame
            </span>
          </div>
        )}

        {/* Gradient shadow overlay over thumbnail */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-black/60" />

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
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-tight shadow-md ${
                isCurrentPlaying
                  ? 'bg-bifrost-amber text-zinc-950'
                  : episode.completed
                    ? 'bg-zinc-800/90 text-zinc-400'
                    : 'bg-black/75 backdrop-blur-sm text-bifrost-amber border border-bifrost-amber/30'
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
          <span className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-mono text-zinc-300 border border-zinc-800">
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
      <div className="p-3.5 space-y-1.5">
        <h4
          className={`text-sm font-semibold line-clamp-1 group-hover:text-bifrost-amber transition-colors ${
            episode.completed ? 'text-zinc-400 line-through' : 'text-zinc-100'
          }`}
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
      <div className="w-full h-1.5 bg-zinc-950 overflow-hidden relative">
        <div
          className={`h-full transition-all duration-300 ${
            episode.completed
              ? 'bg-emerald-500'
              : progressPercent > 0
                ? 'bg-gradient-to-r from-amber-600 to-bifrost-amber'
                : 'bg-transparent'
          }`}
          style={{ width: episode.completed ? '100%' : `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}
