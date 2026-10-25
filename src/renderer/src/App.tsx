import React, { useState, useEffect, useCallback } from 'react'
import { Series, Episode, LibraryData, AppSettings, VlcStateUpdate } from '../../shared/types'
import { Sidebar } from './components/Sidebar'
import { HeroBanner } from './components/HeroBanner'
import { EpisodeGrid } from './components/EpisodeGrid'
import { SettingsModal } from './components/SettingsModal'
import { Eye, AlertCircle, Film, Sparkles } from 'lucide-react'

export const App: React.FC = () => {
  const [library, setLibrary] = useState<LibraryData>({ series: [] })
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeVlcState, setActiveVlcState] = useState<VlcStateUpdate | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Load Library on initial mount
  const loadLibrary = useCallback(async () => {
    try {
      const data = await window.api.getLibrary()
      setLibrary(data)
      if (data.series.length > 0 && !selectedSeriesId) {
        setSelectedSeriesId(data.series[0].id)
      }
    } catch (err) {
      console.error('Failed to load library:', err)
    }
  }, [selectedSeriesId])

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  // Setup VLC telemetry listeners
  useEffect(() => {
    const unsubProgress = window.api.onVlcProgressUpdate((update: VlcStateUpdate) => {
      setActiveVlcState(update)

      // Live update episode progress in state
      if (update.seriesId && update.episodeId) {
        setLibrary((prev) => {
          const nextSeries = prev.series.map((s) => {
            if (s.id !== update.seriesId) return s
            const updatedEpisodes = s.episodes.map((ep) => {
              if (ep.id !== update.episodeId) return ep
              return {
                ...ep,
                timeSec: update.currentTime,
                durationSec: update.duration > 0 ? update.duration : ep.durationSec,
                completed: update.completed || ep.completed,
                lastWatchedAt: Date.now()
              }
            })
            return {
              ...s,
              lastActiveEpisodeId: update.episodeId,
              episodes: updatedEpisodes,
              updatedAt: Date.now()
            }
          })
          return { series: nextSeries }
        })
      }
    })

    const unsubStopped = window.api.onVlcStopped(() => {
      setActiveVlcState(null)
      loadLibrary()
    })

    return () => {
      unsubProgress()
      unsubStopped()
    }
  }, [loadLibrary])

  // Active series object
  const currentSeries = library.series.find((s) => s.id === selectedSeriesId) || null

  // Error toast helper
  const showError = (msg: string) => {
    setErrorMessage(msg)
    setTimeout(() => setErrorMessage(null), 6000)
  }

  // Handlers
  const handleAddSeries = async () => {
    try {
      const folder = await window.api.selectFolder()
      if (!folder) return

      const newSeries = await window.api.addSeries(folder)
      await loadLibrary()
      setSelectedSeriesId(newSeries.id)
    } catch (err: any) {
      showError(err.message || 'Failed to add series folder')
    }
  }

  const handleAddSeason = async () => {
    if (!currentSeries) return
    try {
      const folder = await window.api.selectFolder()
      if (!folder) return

      const updated = await window.api.addSeasonToSeries(currentSeries.id, folder)
      await loadLibrary()
      setSelectedSeriesId(updated.id)
    } catch (err: any) {
      showError(err.message || 'Failed to add season folder')
    }
  }

  const handleRescan = async () => {
    if (!currentSeries) return
    try {
      const updated = await window.api.rescanSeries(currentSeries.id)
      await loadLibrary()
      setSelectedSeriesId(updated.id)
    } catch (err: any) {
      showError(err.message || 'Failed to rescan series')
    }
  }

  const handleDeleteSeries = async () => {
    if (!currentSeries) return
    const confirmed = window.confirm(
      `Remove "${currentSeries.title}" from Heimdall? (Your media files on disk will NOT be deleted)`
    )
    if (!confirmed) return

    try {
      await window.api.removeSeries(currentSeries.id)
      const data = await window.api.getLibrary()
      setLibrary(data)
      setSelectedSeriesId(data.series.length > 0 ? data.series[0].id : null)
    } catch (err: any) {
      showError(err.message || 'Failed to remove series')
    }
  }

  const handlePlayResume = async () => {
    if (!currentSeries) return
    const res = await window.api.playVlc(currentSeries.id, undefined, { advanceIfCompleted: true })
    if (!res.success && res.message) {
      showError(res.message)
    }
  }

  const handlePlayNext = async () => {
    if (!currentSeries) return
    let resumeIndex = -1
    if (currentSeries.lastActiveEpisodeId) {
      resumeIndex = currentSeries.episodes.findIndex((e) => e.id === currentSeries.lastActiveEpisodeId)
    }
    const nextIndex = resumeIndex >= 0 ? resumeIndex + 1 : 0
    if (nextIndex < currentSeries.episodes.length) {
      const nextEp = currentSeries.episodes[nextIndex]
      const res = await window.api.playVlc(currentSeries.id, nextEp.id, { startTime: 0 })
      if (!res.success && res.message) {
        showError(res.message)
      }
    }
  }

  const handlePlayEpisode = async (episodeId: string) => {
    if (!currentSeries) return
    const res = await window.api.playVlc(currentSeries.id, episodeId)
    if (!res.success && res.message) {
      showError(res.message)
    }
  }

  const handleToggleWatched = async (episodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentSeries) return
    await window.api.toggleEpisodeCompleted(currentSeries.id, episodeId)
    await loadLibrary()
  }

  const handleResetProgress = async (episodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentSeries) return
    await window.api.resetEpisodeProgress(currentSeries.id, episodeId)
    await loadLibrary()
  }

  return (
    <div className="flex h-screen bg-background text-zinc-100 overflow-hidden font-sans">
      {/* Left Sidebar */}
      <Sidebar
        seriesList={library.series}
        activeSeriesId={selectedSeriesId}
        onSelectSeries={(id) => setSelectedSeriesId(id)}
        onAddSeries={handleAddSeries}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto flex flex-col p-6 lg:p-8 relative">
        {/* Error Toast Notification */}
        {errorMessage && (
          <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-950/90 border border-red-800 text-red-200 text-xs shadow-2xl backdrop-blur-md animate-in slide-in-from-top-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {currentSeries ? (
          <div>
            {/* Top Hero Section */}
            <HeroBanner
              series={currentSeries}
              activeVlcState={activeVlcState}
              onPlayResume={handlePlayResume}
              onPlayNext={handlePlayNext}
              onAddSeason={handleAddSeason}
              onRescan={handleRescan}
              onDeleteSeries={handleDeleteSeries}
            />

            {/* Episode Grid with Season Tabs & Filters */}
            <EpisodeGrid
              series={currentSeries}
              currentPlayingEpisodeId={
                activeVlcState?.seriesId === currentSeries.id
                  ? activeVlcState.episodeId
                  : null
              }
              onPlayEpisode={handlePlayEpisode}
              onToggleWatched={handleToggleWatched}
              onResetProgress={handleResetProgress}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-surface-border flex items-center justify-center mb-4 shadow-xl">
              <Eye className="w-8 h-8 text-bifrost-amber stroke-[2]" />
            </div>
            <h3 className="text-xl font-bold text-zinc-200">No Series Selected</h3>
            <p className="text-sm text-zinc-500 max-w-sm mt-1.5 mb-6">
              Select a series from the sidebar or import a new folder of video files to start tracking your watch progress.
            </p>
            <button
              onClick={handleAddSeries}
              className="py-2.5 px-5 rounded-xl bg-bifrost-amber hover:bg-bifrost-glow text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-bifrost-amber/20 transition-all"
            >
              <Film className="w-4 h-4 text-zinc-950" />
              Add First Series
            </button>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => {}}
      />
    </div>
  )
}
export default App
