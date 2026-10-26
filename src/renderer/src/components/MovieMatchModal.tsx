import React, { useState } from 'react'
import { Movie, TmdbMovieSearchResult } from '../../../shared/types'
import { Search, Film, Star, X, Check } from 'lucide-react'

interface MovieMatchModalProps {
  isOpen: boolean
  movie: Movie
  onClose: () => void
  onMatched: (updatedMovie: Movie) => void
}

export const MovieMatchModal: React.FC<MovieMatchModalProps> = ({
  isOpen,
  movie,
  onClose,
  onMatched
}) => {
  const [query, setQuery] = useState(movie.cleanTitle)
  const [year, setYear] = useState<string>(movie.year ? movie.year.toString() : '')
  const [results, setResults] = useState<TmdbMovieSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [linkingId, setLinkingId] = useState<number | null>(null)

  if (!isOpen) return null

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim()) return

    setSearching(true)
    try {
      const parsedYear = year.trim() ? parseInt(year.trim(), 10) : undefined
      const data = await window.api.searchTmdb(query.trim(), parsedYear)
      setResults(data)
    } finally {
      setSearching(false)
    }
  }

  const handleSelect = async (tmdbId: number) => {
    setLinkingId(tmdbId)
    try {
      const updated = await window.api.fixMovieMatch(movie.id, tmdbId)
      onMatched(updated)
      onClose()
    } finally {
      setLinkingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-surface-elevated border border-surface-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-bifrost-amber/15 text-bifrost-amber">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">Fix Match (TMDB)</h3>
              <p className="text-xs text-zinc-400 truncate max-w-md">
                File: <span className="font-mono text-zinc-300">{movie.fileName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="p-4 border-b border-surface-border bg-zinc-950/60 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Movie title..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-900 border border-surface-border rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-bifrost-amber"
            />
          </div>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Year (optional)"
            className="w-28 px-3 py-2 text-sm bg-zinc-900 border border-surface-border rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-bifrost-amber"
          />
          <button
            type="submit"
            disabled={searching}
            className="px-5 py-2 text-xs font-bold bg-bifrost-amber hover:bg-bifrost-glow text-zinc-950 rounded-xl transition-colors shadow-md disabled:opacity-50"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {results.length === 0 && !searching && (
            <div className="p-8 text-center text-zinc-500 space-y-1">
              <Film className="w-8 h-8 mx-auto stroke-1 text-zinc-600 mb-2" />
              <p className="text-xs">Type a movie title and click &quot;Search&quot; to query TMDB.</p>
            </div>
          )}

          {results.map((res) => {
            const isMatched = movie.tmdbId === res.id

            return (
              <div
                key={res.id}
                className={`p-3 rounded-xl border flex items-center gap-3.5 transition-all ${
                  isMatched
                    ? 'bg-zinc-850 border-bifrost-amber/60'
                    : 'bg-zinc-900/60 border-surface-border hover:bg-zinc-850 hover:border-zinc-700'
                }`}
              >
                {res.poster_path ? (
                  <img
                    src={res.poster_path}
                    alt={res.title}
                    className="w-12 h-18 object-cover rounded-lg shrink-0 border border-zinc-800"
                  />
                ) : (
                  <div className="w-12 h-18 bg-zinc-800 rounded-lg shrink-0 flex items-center justify-center">
                    <Film className="w-5 h-5 text-zinc-600" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-zinc-100 truncate">{res.title}</h4>
                    {res.year && (
                      <span className="text-xs text-zinc-400 font-mono">({res.year})</span>
                    )}
                    {res.vote_average && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                        {res.vote_average}
                      </span>
                    )}
                  </div>
                  {res.overview && (
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                      {res.overview}
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  {isMatched ? (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Current
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={linkingId === res.id}
                      onClick={() => handleSelect(res.id)}
                      className="px-4 py-1.5 rounded-lg bg-bifrost-amber hover:bg-bifrost-glow text-zinc-950 font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
                    >
                      {linkingId === res.id ? 'Linking...' : 'Select'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
