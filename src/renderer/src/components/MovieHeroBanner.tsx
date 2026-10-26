import React, { useState } from 'react'
import { Movie, VlcStateUpdate } from '../../../shared/types'
import { formatTime } from '../utils/formatters'
import {
  Play,
  Trash2,
  Film,
  Star,
  Edit3,
  Radio,
  Clock,
  Layers,
  Sparkles,
  Zap,
  RotateCcw,
  Minus,
  Plus,
  Loader2
} from 'lucide-react'

interface MovieHeroBannerProps {
  movie: Movie
  activeVlcState: VlcStateUpdate | null
  onPlayResume: () => void
  onFixMatch: () => void
  onDeleteMovie: () => void
  onNotification: (type: 'success' | 'info' | 'error', message: string) => void
  onDelayUpdated: () => void
}

export const MovieHeroBanner: React.FC<MovieHeroBannerProps> = ({
  movie,
  activeVlcState,
  onPlayResume,
  onFixMatch,
  onDeleteMovie,
  onNotification,
  onDelayUpdated
}) => {
  const [isSyncing, setIsSyncing] = useState(false)
  const [currentDelay, setCurrentDelay] = useState<number>(movie.subDelaySec || 0)

  const isPlayingThisMovie =
    activeVlcState?.isRunning && activeVlcState?.movieId === movie.id

  const handleAutoSync = async () => {
    setIsSyncing(true)
    try {
      const res = await window.api.autoSyncMovieSubtitle(movie.id)
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
      const res = await window.api.nudgeMovieSubtitleDelay(movie.id, deltaSec)
      setCurrentDelay(res.currentDelay)
      onDelayUpdated()
    } catch (err: any) {
      onNotification('error', err.message || 'Failed to adjust delay')
    }
  }

  const handleResetDelay = async () => {
    try {
      await window.api.resetMovieSubtitleDelay(movie.id)
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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-surface-border p-6 shadow-2xl mb-6 space-y-5">
      {/* Cinematic Backdrop */}
      {movie.backdropUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-[1px] pointer-events-none"
          style={{ backgroundImage: `url(${movie.backdropUrl})` }}
        />
      )}

      {/* Ambient glows */}
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-bifrost-amber/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
        {/* Left Column: Poster + Movie Details */}
        <div className="flex items-start gap-5 max-w-3xl">
          {movie.posterUrl ? (
            <img
              src={movie.posterUrl}
              alt={movie.title}
              className="w-28 sm:w-36 aspect-[2/3] object-cover rounded-xl border border-surface-border shadow-2xl shrink-0 ring-1 ring-white/10"
            />
          ) : (
            <div className="w-28 sm:w-36 aspect-[2/3] bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col items-center justify-center text-zinc-600 shrink-0">
              <Film className="w-10 h-10 stroke-1 mb-1" />
              <span className="text-[10px] uppercase font-mono">No Poster</span>
            </div>
          )}

          <div className="space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-bifrost-amber/15 text-bifrost-amber border border-bifrost-amber/30 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" />
                Feature Film
              </span>

              {isPlayingThisMovie && (
                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 animate-pulse">
                  <Radio className="w-3.5 h-3.5" />
                  VLC Active
                </span>
              )}

              {movie.resolution && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-bifrost-amber border border-zinc-700">
                  {movie.resolution}
                </span>
              )}

              {movie.videoCodec && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-300 bg-zinc-800 border border-zinc-700">
                  {movie.videoCodec}
                </span>
              )}

              {movie.audioCodec && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-300 bg-zinc-800 border border-zinc-700">
                  {movie.audioCodec}
                </span>
              )}

              {movie.filePaths.length > 1 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/50 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {movie.filePaths.length} Parts
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl lg:text-3xl font-black text-zinc-100 tracking-tight leading-tight">
                {movie.title}
              </h2>
              {movie.year && (
                <span className="text-xl text-zinc-400 font-mono">({movie.year})</span>
              )}
            </div>

            {/* Sub-info: Director, Rating, Runtime, Genres */}
            <div className="flex items-center gap-3 text-xs text-zinc-400 font-medium flex-wrap">
              {movie.rating ? (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-300" />
                  {movie.rating} / 10
                </span>
              ) : null}

              {movie.durationSec > 0 && <span>Runtime: {formatTime(movie.durationSec)}</span>}
              {movie.director && <span>• Directed by {movie.director}</span>}
              {movie.genres && movie.genres.length > 0 && (
                <span>• {movie.genres.slice(0, 3).join(', ')}</span>
              )}
            </div>

            {/* Overview / Synopsis */}
            {movie.overview && (
              <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed max-w-2xl pt-0.5">
                {movie.overview}
              </p>
            )}

            <p className="text-[11px] text-zinc-400 font-mono truncate max-w-lg" title={movie.primaryFilePath}>
              {movie.primaryFilePath}
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                onClick={onFixMatch}
                className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 border border-zinc-700/60 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5 text-bifrost-amber" />
                Fix Match
              </button>

              <button
                onClick={onDeleteMovie}
                title="Remove movie from Heimdall"
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800/40 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-transparent hover:border-red-900/40 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: CTA Resume Card */}
        <div className="shrink-0 bg-zinc-950/70 border border-surface-border rounded-xl p-4 md:w-80 space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-bifrost-amber flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Playback Status
            </span>
            <span className="font-mono text-zinc-400">
              {formatTime(movie.timeSec)} / {formatTime(movie.durationSec)}
            </span>
          </div>

          <div>
            <div className="text-sm font-bold text-zinc-100 truncate">{movie.title}</div>
            <div className="text-xs text-zinc-400 truncate font-mono mt-0.5">
              {movie.fileName}
            </div>
          </div>

          <button
            onClick={onPlayResume}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-bifrost-amber to-amber-600 hover:from-amber-400 hover:to-bifrost-amber text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-bifrost-amber/25 transition-all active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-zinc-950" />
            <span>
              {movie.timeSec > 0
                ? `Resume Movie (${formatTime(movie.timeSec)})`
                : 'Start Movie in VLC'}
            </span>
          </button>
        </div>
      </div>

      {/* Subtitle Sync Controller for Movie */}
      <div className="relative z-10 pt-1">
        <div className="p-3 bg-zinc-950/70 border border-surface-border rounded-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-bifrost-amber/15 text-bifrost-amber">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Movie Subtitle Sync Engine
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
                Align movie audio speech with subtitle track
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-zinc-900 border border-surface-border rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => handleNudge(-0.1)}
                className="px-2 py-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded font-mono flex items-center gap-0.5"
              >
                <Minus className="w-3 h-3" /> 0.1s
              </button>
              <div className="w-px h-4 bg-zinc-800" />
              <button
                type="button"
                onClick={() => handleNudge(0.1)}
                className="px-2 py-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded font-mono flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> 0.1s
              </button>
            </div>

            {currentDelay !== 0 && (
              <button
                type="button"
                onClick={handleResetDelay}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              disabled={isSyncing}
              onClick={handleAutoSync}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-bifrost-amber hover:from-amber-400 hover:to-bifrost-amber text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-bifrost-amber/20 transition-all disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing Movie Audio...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Sync Subtitles</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
