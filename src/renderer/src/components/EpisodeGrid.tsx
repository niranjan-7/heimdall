import React, { useState, useMemo } from 'react'
import { Series, FilterStatus } from '../../../shared/types'
import { EpisodeCard } from './EpisodeCard'
import { Search, Layers, Film, CheckSquare, X, Check, RotateCcw, Sparkles, CheckCheck } from 'lucide-react'

interface EpisodeGridProps {
  series: Series
  currentPlayingEpisodeId: string | null
  onPlayEpisode: (episodeId: string) => void
  onToggleWatched: (episodeId: string, e: React.MouseEvent) => void
  onResetProgress: (episodeId: string, e: React.MouseEvent) => void
  onSeriesUpdated?: (updatedSeries: Series) => void
}

export const EpisodeGrid: React.FC<EpisodeGridProps> = ({
  series,
  currentPlayingEpisodeId,
  onPlayEpisode,
  onToggleWatched,
  onResetProgress,
  onSeriesUpdated
}) => {
  const [selectedSeason, setSelectedSeason] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  // Multi-Selection state
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false)
  const [selectedEpisodeIds, setSelectedEpisodeIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false)

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

  // Toggle selection for a single episode (with Shift-click range support)
  const handleToggleSelect = (episodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setIsSelectionMode(true)

    setSelectedEpisodeIds((prev) => {
      const next = new Set(prev)

      // Range selection with Shift key
      if (e.shiftKey && lastSelectedId) {
        const lastIdx = filteredEpisodes.findIndex((ep) => ep.id === lastSelectedId)
        const currentIdx = filteredEpisodes.findIndex((ep) => ep.id === episodeId)

        if (lastIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(lastIdx, currentIdx)
          const end = Math.max(lastIdx, currentIdx)

          for (let i = start; i <= end; i++) {
            next.add(filteredEpisodes[i].id)
          }
          return next
        }
      }

      // Single item toggle
      if (next.has(episodeId)) {
        next.delete(episodeId)
      } else {
        next.add(episodeId)
      }

      return next
    })

    setLastSelectedId(episodeId)
  }

  // Select all in current filtered view
  const handleSelectAll = () => {
    setIsSelectionMode(true)
    const allIds = new Set(filteredEpisodes.map((e) => e.id))
    setSelectedEpisodeIds(allIds)
  }

  // Clear selection
  const handleClearSelection = () => {
    setSelectedEpisodeIds(new Set())
    setIsSelectionMode(false)
    setLastSelectedId(null)
  }

  // Batch mark watched / unwatched
  const handleBatchWatched = async (completed: boolean) => {
    if (selectedEpisodeIds.size === 0) return
    setIsBatchProcessing(true)

    try {
      const ids = Array.from(selectedEpisodeIds)
      const updated = await window.api.batchUpdateEpisodes(series.id, ids, { completed })
      if (updated && onSeriesUpdated) {
        onSeriesUpdated(updated)
      }
      handleClearSelection()
    } finally {
      setIsBatchProcessing(false)
    }
  }

  // Batch reset progress
  const handleBatchResetProgress = async () => {
    if (selectedEpisodeIds.size === 0) return
    setIsBatchProcessing(true)

    try {
      const ids = Array.from(selectedEpisodeIds)
      const updated = await window.api.batchUpdateEpisodes(series.id, ids, { resetProgress: true })
      if (updated && onSeriesUpdated) {
        onSeriesUpdated(updated)
      }
      handleClearSelection()
    } finally {
      setIsBatchProcessing(false)
    }
  }

  // Mark all prior episodes as watched
  const handleMarkPriorWatched = async () => {
    if (selectedEpisodeIds.size === 0) return
    const firstSelectedId = Array.from(selectedEpisodeIds)[0]
    setIsBatchProcessing(true)

    try {
      const updated = await window.api.markEpisodesPriorTo(series.id, firstSelectedId)
      if (updated && onSeriesUpdated) {
        onSeriesUpdated(updated)
      }
      handleClearSelection()
    } finally {
      setIsBatchProcessing(false)
    }
  }

  // Batch Clean & Normalize Titles
  const handleBatchNormalizeTitles = async () => {
    setIsBatchProcessing(true)
    try {
      const ids = selectedEpisodeIds.size > 0 ? Array.from(selectedEpisodeIds) : undefined
      const updated = await window.api.batchNormalizeEpisodeTitles(series.id, ids)
      if (updated && onSeriesUpdated) {
        onSeriesUpdated(updated)
      }
      handleClearSelection()
    } finally {
      setIsBatchProcessing(false)
    }
  }

  return (
    <div className="space-y-4 relative pb-20">
      {/* Filters and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 liquid-glass p-3.5 rounded-xl border border-white/5">
        {/* Season Tabs */}
        {seasonTabs.length > 1 ? (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedSeason('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
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

        {/* Search, Status Filters & Selection Mode Toggle */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Jump to ep or search..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-black/40 border border-white/10 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-bifrost-amber backdrop-blur-md"
            />
          </div>

          {/* Status Segmented Control */}
          <div className="flex items-center bg-black/40 p-1 rounded-lg border border-white/10 backdrop-blur-md">
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
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  filterStatus === item.id
                    ? 'bg-zinc-800 text-zinc-100 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Multi-Select Toggle Button */}
          <button
            type="button"
            onClick={() => {
              if (isSelectionMode) {
                handleClearSelection()
              } else {
                setIsSelectionMode(true)
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              isSelectionMode
                ? 'bg-bifrost-amber/20 border-bifrost-amber/50 text-bifrost-amber'
                : 'bg-zinc-900 border-surface-border text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{isSelectionMode ? 'Cancel Select' : 'Select'}</span>
          </button>

          {/* Smart Clean & Normalize Button */}
          <button
            type="button"
            onClick={handleBatchNormalizeTitles}
            disabled={isBatchProcessing}
            title="Clean and normalize messy episode filenames (e.g. 'epi - 123' -> 'Episode 123')"
            className="p-1.5 px-2.5 rounded-lg text-xs font-semibold bg-zinc-900 border border-surface-border text-zinc-300 hover:text-bifrost-cyan hover:border-bifrost-cyan/40 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-bifrost-cyan" />
            <span className="hidden sm:inline">Clean Titles</span>
          </button>
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
              isSelectionMode={isSelectionMode}
              isSelected={selectedEpisodeIds.has(episode.id)}
              onPlay={onPlayEpisode}
              onToggleWatched={onToggleWatched}
              onResetProgress={onResetProgress}
              onToggleSelect={handleToggleSelect}
            />
          ))}
        </div>
      )}

      {/* Floating Bottom Batch Action Bar */}
      {selectedEpisodeIds.size > 0 && (
        <div className="fixed bottom-6 inset-x-0 max-w-2xl mx-auto z-40 px-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-3 px-4 rounded-2xl liquid-glass border border-bifrost-amber/50 shadow-2xl backdrop-blur-2xl flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-bifrost-amber text-zinc-950 font-bold text-xs flex items-center justify-center">
                {selectedEpisodeIds.size}
              </span>
              <span className="text-xs font-semibold text-zinc-300">Episodes Selected</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-white/5 transition-colors cursor-pointer"
              >
                Select All
              </button>

              <button
                type="button"
                onClick={() => handleBatchWatched(true)}
                disabled={isBatchProcessing}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Mark Watched</span>
              </button>

              <button
                type="button"
                onClick={() => handleBatchWatched(false)}
                disabled={isBatchProcessing}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
              >
                Unwatch
              </button>

              {selectedEpisodeIds.size === 1 && (
                <button
                  type="button"
                  onClick={handleMarkPriorWatched}
                  disabled={isBatchProcessing}
                  title="Marks all episodes preceding this one as watched"
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-300 text-xs font-medium border border-amber-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Prior Watched</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleBatchResetProgress}
                disabled={isBatchProcessing}
                title="Reset progress to 0:00"
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleClearSelection}
                title="Cancel selection"
                className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
