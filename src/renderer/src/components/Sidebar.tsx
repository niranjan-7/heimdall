import React from 'react'
import { Series, Movie } from '../../../shared/types'
import {
  Eye,
  FolderPlus,
  Settings as SettingsIcon,
  Film,
  Sparkles,
  Tv,
  Clapperboard,
  Smartphone
} from 'lucide-react'

interface SidebarProps {
  viewMode: 'series' | 'movies'
  onViewModeChange: (mode: 'series' | 'movies') => void
  seriesList: Series[]
  moviesList: Movie[]
  activeSeriesId: string | null
  activeMovieId: string | null
  onSelectSeries: (seriesId: string) => void
  onSelectMovie: (movieId: string) => void
  onAddFolder: () => void
  onOpenSettings: () => void
  onOpenMobileRemote?: () => void
  hasUpdate?: boolean
}

export const Sidebar: React.FC<SidebarProps> = ({
  viewMode,
  onViewModeChange,
  seriesList,
  moviesList,
  activeSeriesId,
  activeMovieId,
  onSelectSeries,
  onSelectMovie,
  onAddFolder,
  onOpenSettings,
  onOpenMobileRemote,
  hasUpdate
}) => {
  return (
    <aside className="w-72 h-screen flex flex-col liquid-glass-panel border-r border-white/10 select-none shrink-0 relative z-10">
      {/* Brand Header */}
      <div className="p-4 border-b border-white/10 space-y-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-bifrost-amber to-amber-700 flex items-center justify-center shadow-lg shadow-bifrost-amber/20 ring-1 ring-amber-400/30">
            <Eye className="w-5 h-5 text-zinc-950 font-bold stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black tracking-wider text-zinc-100 uppercase">
                Heimdall
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-bifrost-amber/15 text-bifrost-amber border border-bifrost-amber/30">
                VLC
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">All-Seeing Media Tracker</p>
          </div>
        </div>

        {/* Top View Mode Switcher: Series vs Movies */}
        <div className="grid grid-cols-2 p-1 bg-white/[0.04] rounded-xl border border-white/10 backdrop-blur-md">
          <button
            onClick={() => onViewModeChange('series')}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              viewMode === 'series'
                ? 'bg-amber-500/20 border border-amber-500/40 text-bifrost-amber shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Series ({seriesList.length})</span>
          </button>
          <button
            onClick={() => onViewModeChange('movies')}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              viewMode === 'movies'
                ? 'bg-amber-500/20 border border-amber-500/40 text-bifrost-amber shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clapperboard className="w-3.5 h-3.5" />
            <span>Movies ({moviesList.length})</span>
          </button>
        </div>

        {/* Dynamic Add Folder Button */}
        <button
          onClick={onAddFolder}
          className="w-full py-2 px-3 rounded-xl liquid-glass-pill hover:bg-white/[0.1] text-zinc-200 border border-white/10 hover:border-bifrost-amber/40 transition-all flex items-center justify-center gap-2 group shadow-sm"
        >
          <FolderPlus className="w-4 h-4 text-bifrost-amber group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold">
            {viewMode === 'series' ? 'Add Series Folder' : 'Add Movies Folder'}
          </span>
        </button>
      </div>

      {/* Library Scrollable List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        <div className="px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase flex items-center justify-between">
          <span>{viewMode === 'series' ? 'Series' : 'Movies'} Library</span>
          <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
        </div>

        {viewMode === 'series' ? (
          // Series List
          seriesList.length === 0 ? (
            <div className="p-6 text-center text-zinc-500 space-y-2 mt-4">
              <Film className="w-8 h-8 mx-auto stroke-1 text-zinc-600" />
              <p className="text-xs">No series added yet.</p>
              <p className="text-[11px] text-zinc-600">
                Click &quot;Add Series Folder&quot; to import your series.
              </p>
            </div>
          ) : (
            seriesList.map((series) => {
              const isSelected = series.id === activeSeriesId
              const totalEpisodes = series.episodes.length
              const completedEpisodes = series.episodes.filter((e) => e.completed).length
              const progressPercent =
                totalEpisodes > 0 ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0

              return (
                <button
                  key={series.id}
                  onClick={() => onSelectSeries(series.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all relative overflow-hidden group flex items-center gap-3 ${
                    isSelected
                      ? 'liquid-glass border-bifrost-amber/60 shadow-lg shadow-black/40 ring-1 ring-amber-400/30'
                      : 'bg-white/[0.03] hover:bg-white/[0.08] border border-transparent hover:border-white/10 backdrop-blur-md'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-bifrost-amber to-amber-600" />
                  )}

                  {series.coverImage ? (
                    <img
                      src={series.coverImage}
                      alt={series.aniListTitle || series.title}
                      className="w-10 h-14 object-cover rounded-md shrink-0 border border-surface-border shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-zinc-950 rounded-md shrink-0 border border-zinc-800 flex items-center justify-center">
                      <Film className="w-4 h-4 text-zinc-600" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-xs font-semibold truncate block ${
                        isSelected ? 'text-zinc-100' : 'text-zinc-300 group-hover:text-zinc-100'
                      }`}
                      title={series.aniListTitle || series.title}
                    >
                      {series.aniListTitle || series.title}
                    </span>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mt-1">
                      <span>{completedEpisodes}/{totalEpisodes} watched</span>
                      <span className="font-semibold text-zinc-400">{progressPercent}%</span>
                    </div>

                    <div className="mt-1.5 h-1 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/60">
                      <div
                        className="h-full bg-gradient-to-r from-amber-600 to-bifrost-amber rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </button>
              )
            })
          )
        ) : (
          // Movies List
          moviesList.length === 0 ? (
            <div className="p-6 text-center text-zinc-500 space-y-2 mt-4">
              <Film className="w-8 h-8 mx-auto stroke-1 text-zinc-600" />
              <p className="text-xs">No movies imported.</p>
              <p className="text-[11px] text-zinc-600">
                Click &quot;Add Movies Folder&quot; to scan films.
              </p>
            </div>
          ) : (
            moviesList.map((movie) => {
              const isSelected = movie.id === activeMovieId
              const progressPercent =
                movie.durationSec > 0
                  ? Math.min(100, Math.round((movie.timeSec / movie.durationSec) * 100))
                  : 0

              return (
                <button
                  key={movie.id}
                  onClick={() => onSelectMovie(movie.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all relative overflow-hidden group flex items-center gap-3 ${
                    isSelected
                      ? 'liquid-glass border-bifrost-amber/60 shadow-lg shadow-black/40 ring-1 ring-amber-400/30'
                      : 'bg-white/[0.03] hover:bg-white/[0.08] border border-transparent hover:border-white/10 backdrop-blur-md'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-bifrost-amber to-amber-600" />
                  )}

                  {movie.posterUrl ? (
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-10 h-14 object-cover rounded-md shrink-0 border border-surface-border shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-zinc-950 rounded-md shrink-0 border border-zinc-800 flex items-center justify-center">
                      <Film className="w-4 h-4 text-zinc-600" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-xs font-semibold truncate block ${
                        isSelected ? 'text-zinc-100' : 'text-zinc-300 group-hover:text-zinc-100'
                      }`}
                      title={movie.title}
                    >
                      {movie.title}
                    </span>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mt-1">
                      <span>{movie.year || 'Movie'}</span>
                      <span className="font-semibold text-zinc-400">
                        {movie.completed ? 'Watched' : progressPercent > 0 ? `${progressPercent}%` : ''}
                      </span>
                    </div>

                    <div className="mt-1.5 h-1 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/60">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          movie.completed
                            ? 'bg-emerald-500'
                            : 'bg-gradient-to-r from-amber-600 to-bifrost-amber'
                        }`}
                        style={{ width: movie.completed ? '100%' : `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </button>
              )
            })
          )
        )}
      </div>

      {/* Footer / Mobile Remote & Settings Bar */}
      <div className="p-3 border-t border-white/10 bg-transparent space-y-1">
        {onOpenMobileRemote && (
          <button
            onClick={onOpenMobileRemote}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-amber-500/10 text-zinc-400 hover:text-amber-300 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-zinc-300 group-hover:text-amber-200">Mobile Remote</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">QR</span>
          </button>
        )}

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 transition-colors group relative"
        >
          <div className="flex items-center gap-2.5">
            <SettingsIcon className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200" />
            <span className="text-xs font-medium">Settings</span>
          </div>
          <div className="flex items-center gap-1.5">
            {hasUpdate ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300 shadow-sm animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Update
              </span>
            ) : (
              <span className="text-[10px] text-zinc-500 font-mono">v1.2.1</span>
            )}
          </div>
        </button>
      </div>
    </aside>
  )
}
