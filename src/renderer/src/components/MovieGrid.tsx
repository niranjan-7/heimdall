import React, { useState, useMemo } from 'react'
import { Movie, FilterStatus } from '../../../shared/types'
import { MovieCard } from './MovieCard'
import { Search, Film, SlidersHorizontal, ArrowUpDown } from 'lucide-react'

interface MovieGridProps {
  movies: Movie[]
  currentPlayingMovieId: string | null
  onPlayMovie: (movieId: string) => void
  onToggleWatched: (movieId: string, e: React.MouseEvent) => void
  onFixMatch: (movie: Movie, e: React.MouseEvent) => void
  onSelectMovie: (movie: Movie) => void
}

type SortField = 'title' | 'year' | 'rating' | 'duration'

export const MovieGrid: React.FC<MovieGridProps> = ({
  movies,
  currentPlayingMovieId,
  onPlayMovie,
  onToggleWatched,
  onFixMatch,
  onSelectMovie
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [sortField, setSortField] = useState<SortField>('title')
  const [sortAsc, setSortAsc] = useState(true)

  const filteredMovies = useMemo(() => {
    let list = movies.filter((m) => {
      // Status filter
      if (filterStatus === 'completed' && !m.completed) return false
      if (filterStatus === 'unwatched' && (m.completed || m.timeSec > 0)) return false
      if (filterStatus === 'in_progress' && (m.completed || m.timeSec === 0)) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = m.title.toLowerCase().includes(q)
        const matchClean = m.cleanTitle.toLowerCase().includes(q)
        const matchFile = m.fileName.toLowerCase().includes(q)
        const matchYear = m.year && m.year.toString().includes(q)
        return matchTitle || matchClean || matchFile || matchYear
      }

      return true
    })

    // Sort
    list.sort((a, b) => {
      let comparison = 0
      if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
      } else if (sortField === 'year') {
        comparison = (a.year || 0) - (b.year || 0)
      } else if (sortField === 'rating') {
        comparison = (a.rating || 0) - (b.rating || 0)
      } else if (sortField === 'duration') {
        comparison = a.durationSec - b.durationSec
      }
      return sortAsc ? comparison : -comparison
    })

    return list
  }, [movies, filterStatus, searchQuery, sortField, sortAsc])

  return (
    <div className="space-y-4">
      {/* Search, Filter & Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 liquid-glass p-3.5 rounded-xl border border-white/5">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movie title, year..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-950 border border-surface-border rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-bifrost-amber"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status filter buttons */}
          <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-surface-border">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'unwatched', label: 'Unwatched' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'completed', label: 'Watched' }
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setFilterStatus(item.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  filterStatus === item.id
                    ? 'bg-zinc-800 text-zinc-100 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded-lg border border-surface-border text-xs text-zinc-300">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="title" className="bg-zinc-900">Title</option>
              <option value="year" className="bg-zinc-900">Year</option>
              <option value="rating" className="bg-zinc-900">Rating</option>
              <option value="duration" className="bg-zinc-900">Runtime</option>
            </select>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              title="Toggle sort direction"
              className="p-1 hover:text-white"
            >
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Movies Grid */}
      {filteredMovies.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-surface border border-surface-border text-zinc-500 space-y-2">
          <Film className="w-10 h-10 mx-auto stroke-1 text-zinc-600 mb-2" />
          <h4 className="text-sm font-bold text-zinc-300">No movies found</h4>
          <p className="text-xs text-zinc-500">
            Try adjusting your search query or status filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-8">
          {filteredMovies.map((movie) => (
            <div key={movie.id} onClick={() => onSelectMovie(movie)}>
              <MovieCard
                movie={movie}
                isCurrentPlaying={currentPlayingMovieId === movie.id}
                onPlay={onPlayMovie}
                onToggleWatched={onToggleWatched}
                onFixMatch={onFixMatch}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
