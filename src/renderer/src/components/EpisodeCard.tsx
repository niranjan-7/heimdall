import React from 'react'
import { Episode } from '../../../shared/types'
import { formatTime, formatRelativeTime, calculateProgress } from '../utils/formatters'
import { Play, Check, RotateCcw, Radio } from 'lucide-react'

interface EpisodeCardProps {
  episode: Episode
  isCurrentPlaying: boolean
  onPlay: (episodeId: string) => void
  onToggleWatched: (episodeId: string, e: React.MouseEvent) => void
  onResetProgress: (episodeId: string, e: React.MouseEvent) => void
}

export const EpisodeCard: React.FC<EpisodeCardProps> = ({
  episode,
  isCurrentPlaying,
  onPlay,
  onToggleWatched,
  onResetProgress
}) => {
  const progressPercent = calculateProgress(episode.timeSec, episode.durationSec)
  const relativeWatched = formatRelativeTime(episode.lastWatchedAt)

  return (
    <div
      onClick={() => onPlay(episode.id)}
      className={`group relative rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between ${
        isCurrentPlaying
          ? 'bg-zinc-800/90 border-bifrost-amber ring-1 ring-bifrost-amber/50 shadow-lg shadow-bifrost-amber/15'
          : episode.completed
            ? 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-850 hover:border-zinc-700'
            : 'bg-zinc-900/80 border-surface-border hover:bg-zinc-850 hover:border-zinc-700 hover:shadow-md'
      }`}
    >
      <div className="p-4 space-y-3">
        {/* Top Header: Ep number, Season, Status badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold tracking-tight ${
                isCurrentPlaying
                  ? 'bg-bifrost-amber text-zinc-950'
                  : episode.completed
                    ? 'bg-zinc-800 text-zinc-400'
                    : 'bg-zinc-800 text-bifrost-amber'
              }`}
            >
              EP {episode.episodeNumber ?? '?'}
            </span>

            {episode.seasonName && episode.seasonName !== 'All Episodes' && (
              <span className="text-[11px] font-medium text-zinc-400 truncate max-w-[120px]">
                {episode.seasonName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isCurrentPlaying && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold animate-pulse">
                <Radio className="w-3 h-3" />
                NOW PLAYING
              </span>
            )}

            {/* Watched toggle button */}
            <button
              type="button"
              onClick={(e) => onToggleWatched(episode.id, e)}
              title={episode.completed ? 'Mark as unwatched' : 'Mark as watched'}
              className={`p-1.5 rounded-lg transition-colors ${
                episode.completed
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Title & Filename */}
        <div>
          <h4
            className={`text-sm font-semibold line-clamp-1 group-hover:text-bifrost-amber transition-colors ${
              episode.completed ? 'text-zinc-400 line-through' : 'text-zinc-100'
            }`}
            title={episode.title}
          >
            {episode.title}
          </h4>
          <p
            className="text-[11px] text-zinc-400 font-mono truncate mt-0.5"
            title={episode.fileName}
          >
            {episode.fileName}
          </p>
        </div>

        {/* Timestamps & Relative Watched Date */}
        <div className="flex items-center justify-between text-xs text-zinc-400 font-mono pt-1">
          <span>
            {episode.durationSec > 0
              ? `${formatTime(episode.timeSec)} / ${formatTime(episode.durationSec)}`
              : episode.timeSec > 0
                ? formatTime(episode.timeSec)
                : 'Not started'}
          </span>

          <div className="flex items-center gap-2">
            {relativeWatched && <span className="text-[11px] text-zinc-400">{relativeWatched}</span>}
            {episode.timeSec > 0 && (
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

      {/* Hover Play Button Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
        <div className="w-12 h-12 rounded-full bg-bifrost-amber text-zinc-950 flex items-center justify-center shadow-xl shadow-bifrost-amber/30 transform group-hover:scale-105 transition-transform">
          <Play className="w-5 h-5 fill-zinc-950 ml-0.5" />
        </div>
      </div>

      {/* Progress Bar at bottom */}
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
