import React, { useState } from 'react'
import { Movie } from '../../../shared/types'
import { formatTime, calculateProgress } from '../utils/formatters'
import { Play, Check, Edit3, Star, Film, Radio, Layers } from 'lucide-react'

interface MovieCardProps {
  movie: Movie
  isCurrentPlaying: boolean
  onPlay: (movieId: string) => void
  onToggleWatched: (movieId: string, e: React.MouseEvent) => void
  onFixMatch: (movie: Movie, e: React.MouseEvent) => void
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  isCurrentPlaying,
  onPlay,
  onToggleWatched,
  onFixMatch
}) => {
  const [thumbError, setThumbError] = useState(false)
  const progressPercent = calculateProgress(movie.timeSec, movie.durationSec)
  const thumbUrl = `heimdall-thumb:///${encodeURIComponent(movie.id)}`

  return (
    <div
      onClick={() => onPlay(movie.id)}
      className={`group relative rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between ${
        isCurrentPlaying
          ? 'liquid-glass border-bifrost-amber ring-2 ring-bifrost-amber/40 shadow-xl shadow-bifrost-amber/25 scale-[1.01]'
          : movie.completed
            ? 'liquid-glass-subtle hover:border-zinc-600'
            : 'liquid-glass-interactive'
      }`}
    >
      {/* Poster / Hover Video Frame Container (2:3 Aspect Ratio) */}
      <div className="relative w-full aspect-[2/3] bg-zinc-950 overflow-hidden flex items-center justify-center">
        {/* Resting View: Official TMDB Poster if available */}
        {movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center bg-gradient-to-b from-zinc-850 to-zinc-950 text-zinc-500">
            <Film className="w-10 h-10 stroke-1 text-zinc-600 mb-2" />
            <span className="text-xs font-bold text-zinc-300 line-clamp-2">{movie.title}</span>
            {movie.year && (
              <span className="text-[10px] text-zinc-500 font-mono mt-1">({movie.year})</span>
            )}
          </div>
        )}

        {/* Hover View: Local Video Frame Thumbnail Preview (Fades in on hover) */}
        {!thumbError && (
          <img
            src={thumbUrl}
            alt={`${movie.title} frame`}
            onError={() => setThumbError(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          />
        )}

        {/* Dark vignette gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60 pointer-events-none" />

        {/* Top Badges: Tech Specs & Rating */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 z-10">
          <div className="flex items-center gap-1.5">
            {movie.resolution && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black bg-black/80 backdrop-blur-sm text-bifrost-amber border border-bifrost-amber/40 shadow-sm">
                {movie.resolution}
              </span>
            )}

            {movie.filePaths.length > 1 && (
              <span
                title={`${movie.filePaths.length} Parts (CD1, CD2...)`}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-950/80 backdrop-blur-sm text-indigo-300 border border-indigo-700/50 flex items-center gap-0.5"
              >
                <Layers className="w-3 h-3" />
                {movie.filePaths.length}P
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Fix Match Button */}
            <button
              type="button"
              onClick={(e) => onFixMatch(movie, e)}
              title="Fix Match with TMDB"
              className="p-1.5 rounded-lg bg-black/75 backdrop-blur-sm text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700/60 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit3 className="w-3 h-3" />
            </button>

            {/* Toggle Watched */}
            <button
              type="button"
              onClick={(e) => onToggleWatched(movie.id, e)}
              title={movie.completed ? 'Mark as unwatched' : 'Mark as watched'}
              className={`p-1.5 rounded-lg shadow-md transition-colors ${
                movie.completed
                  ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
                  : 'bg-black/70 backdrop-blur-sm text-zinc-300 hover:text-white hover:bg-black/90 border border-zinc-700/60'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Center Hover Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/35 backdrop-blur-[1px] pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-bifrost-amber text-zinc-950 flex items-center justify-center shadow-xl shadow-bifrost-amber/30 transform group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 fill-zinc-950 ml-0.5" />
          </div>
        </div>

        {/* Bottom Card Badges: Rating & Duration */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-mono text-zinc-300 z-10 pointer-events-none">
          {movie.rating ? (
            <span className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-amber-400 font-bold flex items-center gap-1 border border-zinc-800">
              <Star className="w-3 h-3 fill-amber-400" />
              {movie.rating}
            </span>
          ) : (
            <span />
          )}

          <span className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-zinc-300 border border-zinc-800">
            {formatTime(movie.durationSec)}
          </span>
        </div>
      </div>

      {/* Title & Info Section */}
      <div className="p-3.5 space-y-1">
        <div className="flex items-center justify-between gap-1">
          <h4
            className={`text-sm font-bold truncate group-hover:text-bifrost-amber transition-colors ${
              movie.completed ? 'text-zinc-400 line-through' : 'text-zinc-100'
            }`}
            title={movie.title}
          >
            {movie.title}
          </h4>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
          <span className="text-[11px]">{movie.year || 'Unknown Year'}</span>
          {isCurrentPlaying ? (
            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
              <Radio className="w-3 h-3" />
              PLAYING
            </span>
          ) : movie.timeSec > 0 ? (
            <span className="text-[11px] text-zinc-400">{formatTime(movie.timeSec)} left off</span>
          ) : null}
        </div>
      </div>

      {/* Progress Bar along bottom edge */}
      <div className="w-full h-1.5 bg-zinc-950 overflow-hidden relative">
        <div
          className={`h-full transition-all duration-300 ${
            movie.completed
              ? 'bg-emerald-500'
              : progressPercent > 0
                ? 'bg-gradient-to-r from-amber-600 to-bifrost-amber'
                : 'bg-transparent'
          }`}
          style={{ width: movie.completed ? '100%' : `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}
