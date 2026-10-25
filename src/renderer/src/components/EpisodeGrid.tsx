import React, { useState, useMemo } from 'react'
import { Series, Episode, FilterStatus } from '../../../shared/types'
import { EpisodeCard } from './EpisodeCard'
import { Search, Filter, Layers, Film } from 'lucide-react'

interface EpisodeGridProps {
  series: Series
  currentPlayingEpisodeId: string | null
  onPlayEpisode: (episodeId: string) => void
  onToggleWatched: (episodeId: string, e: React.MouseEvent) => void
  onResetProgress: (episodeId: string, e: React.MouseEvent) => void
}

export const EpisodeGrid: React.FC<EpisodeGridProps> = ({
  series,
  currentPlayingEpisodeId,
  onPlayEpisode,
  onToggleWatched,
  onResetProgress
}) => {
  const [selectedSeason, setSelectedSeason] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  // Extract distinct seasons
  const seasonTabs = useMemo(() => {
    const seasons = new Set<string>()
    series.episodes.forEach((ep) => {
      if (ep.seasonName) seasons.add(ep.seasonName)
    })
    return Array.from(seasons)
  }, [series.episodes])

  // Filter episodes
  const filteredEpisodes = useMemo(() => {
    return series.episodes.filter((ep) => {
      // Season filter
      if (selectedSeason !== 'all' && ep.seasonName !== selectedSeason) {
        return false
      }

      // Status filter
      if (filterStatus === 'completed' && !ep.completed) return false
      if (filterStatus === 'unwatched' && (ep.completed || ep.timeSec > 0)) return false
      if (filterStatus === 'in_progress' && (ep.completed || ep.timeSec === 0)) return false

      // Search query (matches title, filename, or episode number)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchTitle = ep.title.toLowerCase().includes(query)
        const matchFile = ep.fileName.toLowerCase().includes(query)
        const matchEpNum =
          ep.episodeNumber !== null && ep.episodeNumber.toString() === query.replace(/^ep?\.?\s*/i, '')
        return matchTitle || matchFile || matchEpNum
      }

      return true
    })
  }, [series.episodes, selectedSeason, filterStatus, searchQuery])

  return (
    <div className="space-y-4">
      {/* Filters and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface p-3.5 rounded-xl border border-surface-border">
        {/* Season Tabs */}
        {seasonTabs.length > 1 ? (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedSeason('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedSeason === 'all'
                  ? 'bg-bifrost-amber text-zinc-950 shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              All Seasons ({series.episodes.length})
            </button>
            {seasonTabs.map((season) => {
              const count = series.episodes.filter((e) => e.seasonName === season).length
              return (
                <button
                  key={season}
                  onClick={() => setSelectedSeason(season)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedSeason === season
                      ? 'bg-bifrost-amber text-zinc-950 shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  {season} ({count})
                </button>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
            <Layers className="w-4 h-4 text-bifrost-amber" />
            <span>Episodes ({series.episodes.length})</span>
          </div>
        )}

        {/* Search & Status Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Jump to ep or search..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-950 border border-surface-border rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-bifrost-amber"
            />
          </div>

          {/* Status Segmented Control */}
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
        </div>
      </div>

      {/* Episode Grid */}
      {filteredEpisodes.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface border border-surface-border text-zinc-500 space-y-2">
          <Film className="w-8 h-8 mx-auto stroke-1 text-zinc-600" />
          <p className="text-sm font-medium text-zinc-400">No episodes matched your filter</p>
          <p className="text-xs text-zinc-600">
            Try clearing the search term or switching to another season or status tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-8">
          {filteredEpisodes.map((episode) => (
            <EpisodeCard
              key={episode.id}
              episode={episode}
              isCurrentPlaying={currentPlayingEpisodeId === episode.id}
              onPlay={onPlayEpisode}
              onToggleWatched={onToggleWatched}
              onResetProgress={onResetProgress}
            />
          ))}
        </div>
      )}
    </div>
  )
}
