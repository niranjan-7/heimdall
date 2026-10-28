import React, { useState, useEffect, useCallback } from 'react'
import { Series, Movie, LibraryData, VlcStateUpdate, AppNotification, AppSettings, UITheme } from '../../shared/types'
import { Sidebar } from './components/Sidebar'
import { HeroBanner } from './components/HeroBanner'
import { EpisodeGrid } from './components/EpisodeGrid'
import { MovieHeroBanner } from './components/MovieHeroBanner'
import { MovieGrid } from './components/MovieGrid'
import { SettingsModal } from './components/SettingsModal'
import { AniListSearchModal } from './components/AniListSearchModal'
import { MovieMatchModal } from './components/MovieMatchModal'
import { MobileRemoteModal } from './components/MobileRemoteModal'
import { LiquidGlassSvgFilter } from './components/ui/LiquidGlass'
import { Eye, AlertCircle, Film, CheckCircle2, Info, Clapperboard } from 'lucide-react'

export const App: React.FC = () => {
  const [library, setLibrary] = useState<LibraryData>({ series: [], movies: [] })
  const [viewMode, setViewMode] = useState<'series' | 'movies'>('series')
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileRemoteOpen, setMobileRemoteOpen] = useState(false)
  const [aniListModalOpen, setAniListModalOpen] = useState(false)
  const [matchingMovie, setMatchingMovie] = useState<Movie | null>(null)

  const [activeVlcState, setActiveVlcState] = useState<VlcStateUpdate | null>(null)
  const [notification, setNotification] = useState<AppNotification | null>(null)
  const [hasUpdate, setHasUpdate] = useState(false)
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null)

  const loadSettings = useCallback(async () => {
    try {
      const s = await window.api.getSettings()
      setAppSettings(s)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    window.api
      .checkForUpdates()
      .then((info) => {
        if (info && info.hasUpdate) {
          setHasUpdate(true)
        }
      })
      .catch(() => {})
  }, [])

  const loadLibrary = useCallback(async () => {
    try {
      const data = await window.api.getLibrary()
      setLibrary(data)
      if (data.series.length > 0 && !selectedSeriesId) {
        setSelectedSeriesId(data.series[0].id)
      }
      if (data.movies && data.movies.length > 0 && !selectedMovieId) {
        setSelectedMovieId(data.movies[0].id)
      }
    } catch (err) {
      console.error('Failed to load library:', err)
    }
  }, [selectedSeriesId, selectedMovieId])

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  useEffect(() => {
    const unsubProgress = window.api.onVlcProgressUpdate((update: VlcStateUpdate) => {
      setActiveVlcState(update)

      // Live update movie
      if (update.movieId) {
        setLibrary((prev) => ({
          ...prev,
          movies: (prev.movies || []).map((m) => {
            if (m.id !== update.movieId) return m
            return {
              ...m,
              timeSec: update.currentTime,
              durationSec: update.duration > 0 ? update.duration : m.durationSec,
              completed: update.completed || m.completed,
              lastWatchedAt: Date.now()
            }
          })
        }))
        return
      }

      // Live update series
      if (update.seriesId && update.episodeId) {
        setLibrary((prev) => ({
          ...prev,
          series: prev.series.map((s) => {
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
        }))
      }
    })

    const unsubStopped = window.api.onVlcStopped(() => {
      setActiveVlcState(null)
      loadLibrary()
    })

    const unsubThumb = window.api.onThumbnailGenerated(({ id, isMovie }) => {
      setLibrary((prev) => {
        if (isMovie) {
          return {
            ...prev,
            movies: (prev.movies || []).map((m) => (m.id === id ? { ...m, hasThumbnail: true } : m))
          }
        }
        return {
          ...prev,
          series: prev.series.map((s) => ({
            ...s,
            episodes: s.episodes.map((ep) => (ep.id === id ? { ...ep, hasThumbnail: true } : ep))
          }))
        }
      })
    })

    const unsubNotification = window.api.onNotification((notif) => {
      setNotification(notif)
      setTimeout(() => setNotification(null), 5000)
    })

    const unsubSeriesUpdated = window.api.onSeriesUpdated((updatedSeries) => {
      setLibrary((prev) => ({
        ...prev,
        series: prev.series.map((s) => (s.id === updatedSeries.id ? updatedSeries : s))
      }))
    })

    const unsubMovieUpdated = window.api.onMovieUpdated((updatedMovie) => {
      setLibrary((prev) => ({
        ...prev,
        movies: (prev.movies || []).map((m) => (m.id === updatedMovie.id ? updatedMovie : m))
      }))
    })

    return () => {
      unsubProgress()
      unsubStopped()
      unsubThumb()
      unsubNotification()
      unsubSeriesUpdated()
      unsubMovieUpdated()
    }
  }, [loadLibrary])

  const currentSeries = library.series.find((s) => s.id === selectedSeriesId) || null
  const currentMovie = (library.movies || []).find((m) => m.id === selectedMovieId) || null

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  // Series Handlers
  const handleAddSeries = async () => {
    try {
      const folder = await window.api.selectFolder()
      if (!folder) return

      const newSeries = await window.api.addSeries(folder)
      await loadLibrary()
      setSelectedSeriesId(newSeries.id)
      setViewMode('series')
      showToast('info', `Imported "${newSeries.aniListTitle || newSeries.title}" (${newSeries.episodes.length} episodes)`)
    } catch (err: any) {
      showToast('error', err.message || 'Failed to add series folder')
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
      showToast('success', `Added season to "${updated.aniListTitle || updated.title}"`)
    } catch (err: any) {
      showToast('error', err.message || 'Failed to add season folder')
    }
  }

  const handleRescanSeries = async () => {
    if (!currentSeries) return
    try {
      const updated = await window.api.rescanSeries(currentSeries.id)
      await loadLibrary()
      setSelectedSeriesId(updated.id)
      showToast('info', `Rescanned "${updated.aniListTitle || updated.title}"`)
    } catch (err: any) {
      showToast('error', err.message || 'Failed to rescan series')
    }
  }

  const handleDeleteSeries = async () => {
    if (!currentSeries) return
    const confirmed = window.confirm(
      `Remove "${currentSeries.aniListTitle || currentSeries.title}" from Heimdall? (Media files on disk will NOT be deleted)`
    )
    if (!confirmed) return

    try {
      await window.api.removeSeries(currentSeries.id)
      const data = await window.api.getLibrary()
      setLibrary(data)
      setSelectedSeriesId(data.series.length > 0 ? data.series[0].id : null)
      showToast('info', 'Series removed from library')
    } catch (err: any) {
      showToast('error', err.message || 'Failed to remove series')
    }
  }

  const handlePlayResumeSeries = async () => {
    if (!currentSeries) return
    const res = await window.api.playVlc(currentSeries.id, undefined, { advanceIfCompleted: true })
    if (!res.success && res.message) showToast('error', res.message)
  }

  const handlePlayNextEpisode = async () => {
    if (!currentSeries) return
    let resumeIndex = -1
    if (currentSeries.lastActiveEpisodeId) {
      resumeIndex = currentSeries.episodes.findIndex((e) => e.id === currentSeries.lastActiveEpisodeId)
    }
    const nextIndex = resumeIndex >= 0 ? resumeIndex + 1 : 0
    if (nextIndex < currentSeries.episodes.length) {
      const nextEp = currentSeries.episodes[nextIndex]
      const res = await window.api.playVlc(currentSeries.id, nextEp.id, { startTime: 0 })
      if (!res.success && res.message) showToast('error', res.message)
    }
  }

  const handlePlayEpisode = async (episodeId: string) => {
    if (!currentSeries) return
    const res = await window.api.playVlc(currentSeries.id, episodeId)
    if (!res.success && res.message) showToast('error', res.message)
  }

  const handleToggleEpisodeWatched = async (episodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentSeries) return
    await window.api.toggleEpisodeCompleted(currentSeries.id, episodeId)
    await loadLibrary()
  }

  const handleResetEpisodeProgress = async (episodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentSeries) return
    await window.api.resetEpisodeProgress(currentSeries.id, episodeId)
    await loadLibrary()
  }

  // Movie Handlers
  const handleAddMoviesFolder = async () => {
    try {
      const folder = await window.api.selectFolder()
      if (!folder) return

      showToast('info', 'Scanning folder and querying TMDB metadata...')
      const updatedMovies = await window.api.scanMoviesFolder(folder)
      await loadLibrary()
      setViewMode('movies')
      if (updatedMovies.length > 0) {
        setSelectedMovieId(updatedMovies[0].id)
      }
      showToast('success', `Found and updated ${updatedMovies.length} movies in library`)
    } catch (err: any) {
      showToast('error', err.message || 'Failed to scan movies folder')
    }
  }

  const handlePlayMovie = async (movieId: string) => {
    const res = await window.api.playMovie(movieId)
    if (!res.success && res.message) showToast('error', res.message)
  }

  const handleToggleMovieWatched = async (movieId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await window.api.toggleMovieCompleted(movieId)
    await loadLibrary()
  }

  const handleDeleteMovie = async () => {
    if (!currentMovie) return
    const confirmed = window.confirm(
      `Remove "${currentMovie.title}" from Heimdall? (Media files on disk will NOT be deleted)`
    )
    if (!confirmed) return

    try {
      await window.api.removeMovie(currentMovie.id)
      const data = await window.api.getLibrary()
      setLibrary(data)
      setSelectedMovieId(data.movies && data.movies.length > 0 ? data.movies[0].id : null)
      showToast('info', 'Movie removed from library')
    } catch (err: any) {
      showToast('error', err.message || 'Failed to remove movie')
    }
  }

  const handleMovieMatched = (updatedMovie: Movie) => {
    setLibrary((prev) => ({
      ...prev,
      movies: (prev.movies || []).map((m) => (m.id === updatedMovie.id ? updatedMovie : m))
    }))
    showToast('success', `Matched "${updatedMovie.title}" with TMDB`)
  }

  const currentTheme: UITheme = appSettings?.uiTheme || (appSettings?.enableLiquidGlass === false ? 'classic_dark' : 'liquid_glass')
  const isLiquidGlass = currentTheme === 'liquid_glass'
  const isOled = currentTheme === 'oled_black'

  const handleCycleTheme = async () => {
    const nextTheme: UITheme =
      currentTheme === 'liquid_glass'
        ? 'classic_dark'
        : currentTheme === 'classic_dark'
          ? 'oled_black'
          : 'liquid_glass'

    const updated = {
      ...(appSettings || {} as AppSettings),
      uiTheme: nextTheme,
      enableLiquidGlass: nextTheme === 'liquid_glass'
    } as AppSettings

    setAppSettings(updated)
    await window.api.saveSettings(updated)
    showToast(
      'info',
      `Switched UI theme to ${
        nextTheme === 'classic_dark'
          ? 'Classic Dark (Obsidian)'
          : nextTheme === 'oled_black'
            ? 'OLED Pure Black'
            : 'Liquid Glass'
      }`
    )
  }

  return (
    <div
      className={`flex h-screen text-zinc-100 overflow-hidden font-sans relative theme-${currentTheme.replace('_', '-')} ${
        isLiquidGlass ? 'bg-black/10' : isOled ? 'bg-black' : 'bg-[#0c0d12]'
      }`}
    >
      {/* Global Optical Refraction SVG Filter */}
      {isLiquidGlass && <LiquidGlassSvgFilter />}

      {/* Liquid Glass Ambient Background Caustics */}
      {isLiquidGlass && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="liquid-caustic-amber -top-40 -left-40" />
          <div className="liquid-caustic-indigo top-1/4 -right-28" />
          <div className="liquid-caustic-amber -bottom-48 left-1/3" />
        </div>
      )}

      {/* Left Sidebar */}
      <Sidebar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        seriesList={library.series}
        moviesList={library.movies || []}
        activeSeriesId={selectedSeriesId}
        activeMovieId={selectedMovieId}
        onSelectSeries={(id) => {
          setSelectedSeriesId(id)
          setViewMode('series')
        }}
        onSelectMovie={(id) => {
          setSelectedMovieId(id)
          setViewMode('movies')
        }}
        onAddFolder={viewMode === 'series' ? handleAddSeries : handleAddMoviesFolder}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenMobileRemote={() => setMobileRemoteOpen(true)}
        hasUpdate={hasUpdate}
        currentTheme={currentTheme}
        onThemeCycle={handleCycleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto flex flex-col p-6 lg:p-8 relative z-10">
        {/* Top Header Update Pill */}
        {hasUpdate && (
          <div className="mb-4 flex items-center justify-between px-4 py-2.5 rounded-xl liquid-glass border border-amber-500/40 text-amber-300 text-xs shadow-lg animate-in fade-in shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="font-semibold text-zinc-100">Heimdall Update Available</span>
              <span className="text-zinc-400 hidden sm:inline">• Automated safety backup retains 100% of your data</span>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="px-3 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              Update Now
            </button>
          </div>
        )}

        {/* Floating Notification Toast */}
        {notification && (
          <div
            className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md animate-in slide-in-from-top-3 border ${
              notification.type === 'error'
                ? 'bg-red-950/90 border-red-800 text-red-200'
                : notification.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
                  : 'bg-zinc-900/90 border-surface-border text-zinc-200'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-bifrost-amber shrink-0" />
            )}
            <span className="text-xs font-medium">{notification.message}</span>
          </div>
        )}

        {viewMode === 'series' ? (
          // Series View
          currentSeries ? (
            <div>
              <HeroBanner
                series={currentSeries}
                activeVlcState={activeVlcState}
                onPlayResume={handlePlayResumeSeries}
                onPlayNext={handlePlayNextEpisode}
                onAddSeason={handleAddSeason}
                onRescan={handleRescanSeries}
                onDeleteSeries={handleDeleteSeries}
                onOpenAniListSearch={() => setAniListModalOpen(true)}
                onNotification={showToast}
                onDelayUpdated={loadLibrary}
                onSeriesUpdated={loadLibrary}
              />
              <EpisodeGrid
                series={currentSeries}
                currentPlayingEpisodeId={
                  activeVlcState?.seriesId === currentSeries.id ? activeVlcState.episodeId : null
                }
                dimFiller={appSettings?.dimFillerEpisodes !== false}
                onPlayEpisode={handlePlayEpisode}
                onToggleWatched={handleToggleEpisodeWatched}
                onResetProgress={handleResetEpisodeProgress}
                onSeriesUpdated={loadLibrary}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-surface-border flex items-center justify-center mb-4 shadow-xl">
                <Eye className="w-8 h-8 text-bifrost-amber stroke-[2]" />
              </div>
              <h3 className="text-xl font-bold text-zinc-200">No Series Selected</h3>
              <p className="text-sm text-zinc-500 max-w-sm mt-1.5 mb-6">
                Select a series from the sidebar or import a folder of episodes to start tracking.
              </p>
              <button
                onClick={handleAddSeries}
                className="py-2.5 px-5 rounded-xl bg-bifrost-amber hover:bg-bifrost-glow text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-bifrost-amber/20 transition-all"
              >
                <Film className="w-4 h-4 text-zinc-950" />
                Add Series Folder
              </button>
            </div>
          )
        ) : (
          // Movies View
          currentMovie ? (
            <div>
              <MovieHeroBanner
                movie={currentMovie}
                activeVlcState={activeVlcState}
                onPlayResume={() => handlePlayMovie(currentMovie.id)}
                onFixMatch={() => setMatchingMovie(currentMovie)}
                onDeleteMovie={handleDeleteMovie}
                onNotification={showToast}
                onDelayUpdated={loadLibrary}
              />
              <MovieGrid
                movies={library.movies || []}
                currentPlayingMovieId={
                  activeVlcState?.movieId === currentMovie.id ? activeVlcState.movieId : null
                }
                onPlayMovie={handlePlayMovie}
                onToggleWatched={handleToggleMovieWatched}
                onFixMatch={(movie, e) => {
                  e.stopPropagation()
                  setMatchingMovie(movie)
                }}
                onSelectMovie={(movie) => setSelectedMovieId(movie.id)}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-surface-border flex items-center justify-center mb-4 shadow-xl">
                <Clapperboard className="w-8 h-8 text-bifrost-amber stroke-[2]" />
              </div>
              <h3 className="text-xl font-bold text-zinc-200">No Movies In Library</h3>
              <p className="text-sm text-zinc-500 max-w-sm mt-1.5 mb-6">
                Import a folder containing feature films to enable TMDB cover art, hover video previews, and subtitle sync.
              </p>
              <button
                onClick={handleAddMoviesFolder}
                className="py-2.5 px-5 rounded-xl bg-bifrost-amber hover:bg-bifrost-glow text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-bifrost-amber/20 transition-all"
              >
                <Clapperboard className="w-4 h-4 text-zinc-950" />
                Add Movies Folder
              </button>
            </div>
          )
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={(updated) => setAppSettings(updated)}
      />

      {/* Mobile Remote Pairing Modal */}
      <MobileRemoteModal
        isOpen={mobileRemoteOpen}
        onClose={() => setMobileRemoteOpen(false)}
      />

      {/* AniList Match Modal */}
      {currentSeries && (
        <AniListSearchModal
          isOpen={aniListModalOpen}
          series={currentSeries}
          onClose={() => setAniListModalOpen(false)}
          onLinked={(updatedSeries) => {
            setLibrary((prev) => ({
              ...prev,
              series: prev.series.map((s) => (s.id === updatedSeries.id ? updatedSeries : s))
            }))
            showToast('success', `Linked "${updatedSeries.aniListTitle || updatedSeries.title}" to AniList`)
          }}
        />
      )}

      {/* TMDB Fix Match Modal */}
      {matchingMovie && (
        <MovieMatchModal
          isOpen={true}
          movie={matchingMovie}
          onClose={() => setMatchingMovie(null)}
          onMatched={handleMovieMatched}
        />
      )}
    </div>
  )
}
export default App
