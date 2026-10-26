import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Eye, Radio, Sparkles, MessageSquare, Play, Pause, RotateCcw, Minus, Plus, Check, Zap, Film, Tv, Clock } from 'lucide-react'

interface MediaItem {
  id: string
  title: string
  subtitle: string
  type: 'series' | 'movie'
  epLabel: string
  watchedLabel: string
  currentTimeSec: number
  totalDurationSec: number
  subDelay: number
  player: 'mpv' | 'vlc'
  badges: string[]
}

const SERIES_ITEMS: MediaItem[] = [
  {
    id: 'frieren',
    title: "Frieren: Beyond Journey's End",
    subtitle: 'Episode 18 — Well-Laid Plans',
    type: 'series',
    epLabel: 'Ep 18',
    watchedLabel: '18 of 28 watched (64%)',
    currentTimeSec: 842, // 14:02
    totalDurationSec: 1440, // 24:00
    subDelay: 0.35,
    player: 'mpv',
    badges: ['Anime4K Active', 'FLAC Audio', 'libass Vector']
  },
  {
    id: 'oshinoko',
    title: 'Oshi no Ko Season 2',
    subtitle: 'Episode 11 — The Stage Play Climax',
    type: 'series',
    epLabel: 'Ep 11',
    watchedLabel: '11 of 13 watched (85%)',
    currentTimeSec: 1140, // 19:00
    totalDurationSec: 1420, // 23:40
    subDelay: -0.15,
    player: 'mpv',
    badges: ['Anime4K Active', 'Opus 2.0', 'Auto-Sync 99.8%']
  },
  {
    id: 'dungeon',
    title: 'Dungeon Meshi',
    subtitle: 'Episode 24 — Dumplings & Roasted Basilisk',
    type: 'series',
    epLabel: 'Ep 24',
    watchedLabel: '24 of 24 watched (100%)',
    currentTimeSec: 1560, // 26:00
    totalDurationSec: 1560, // 26:00
    subDelay: 0.0,
    player: 'mpv',
    badges: ['Completed', 'Dual Audio', '0ms Push']
  },
  {
    id: 'sololeveling',
    title: 'Solo Leveling',
    subtitle: 'Episode 12 — Arise',
    type: 'series',
    epLabel: 'Ep 12',
    watchedLabel: '12 of 12 watched (100%)',
    currentTimeSec: 1380, // 23:00
    totalDurationSec: 1380, // 23:00
    subDelay: 0.05,
    player: 'mpv',
    badges: ['Completed', '1080p Hi10P', 'AniList Scrobbler']
  }
]

const MOVIE_ITEMS: MediaItem[] = [
  {
    id: 'oppenheimer',
    title: 'Oppenheimer (2023)',
    subtitle: 'Christopher Nolan • 2160p UHD IMAX Remux',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '02:08:14 of 03:00:20 (71%)',
    currentTimeSec: 7694, // 02:08:14
    totalDurationSec: 10820, // 03:00:20
    subDelay: 0.0,
    player: 'mpv',
    badges: ['IMAX 70mm Aspect', 'DTS-HD MA 5.1', 'HDR10']
  },
  {
    id: 'dune2',
    title: 'Dune: Part Two (2024)',
    subtitle: 'Denis Villeneuve • Remux 4K Dolby Vision',
    type: 'movie',
    epLabel: '4K Movie',
    watchedLabel: '01:14:32 of 02:46:15 (45%)',
    currentTimeSec: 4472, // 01:14:32
    totalDurationSec: 9975, // 02:46:15
    subDelay: 0.2,
    player: 'mpv',
    badges: ['Dolby Atmos', 'CD1/CD2 Merged', 'OpenSubtitles 64KB']
  },
  {
    id: 'interstellar',
    title: 'Interstellar (2014)',
    subtitle: 'Christopher Nolan • 1080p IMAX Edition',
    type: 'movie',
    epLabel: 'Movie',
    watchedLabel: '02:49:03 of 02:49:03 (100%)',
    currentTimeSec: 10143, // 02:49:03
    totalDurationSec: 10143, // 02:49:03
    subDelay: 0.0,
    player: 'vlc',
    badges: ['Universal Codec', 'HTTP Status API', 'Completed']
  },
  {
    id: 'spiritedaway',
    title: 'Spirited Away (2001)',
    subtitle: 'Studio Ghibli • 1080p Remastered Studio Cut',
    type: 'movie',
    epLabel: 'Movie',
    watchedLabel: '01:52:10 of 02:05:00 (90%)',
    currentTimeSec: 6730, // 01:52:10
    totalDurationSec: 7500, // 02:05:00
    subDelay: -0.1,
    player: 'mpv',
    badges: ['Anime4K High', 'FLAC 2.0', 'Auto-Completed 90%']
  }
]

export const InteractiveAppMockup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'series' | 'movies'>('series')
  const [selectedId, setSelectedId] = useState<string>('frieren')
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [mediaStates, setMediaStates] = useState<Record<string, { progressSec: number; subDelay: number }>>({
    frieren: { progressSec: 842, subDelay: 0.35 },
    oshinoko: { progressSec: 1140, subDelay: -0.15 },
    dungeon: { progressSec: 1560, subDelay: 0.0 },
    sololeveling: { progressSec: 1380, subDelay: 0.05 },
    oppenheimer: { progressSec: 7694, subDelay: 0.0 },
    dune2: { progressSec: 4472, subDelay: 0.2 },
    interstellar: { progressSec: 10143, subDelay: 0.0 },
    spiritedaway: { progressSec: 6730, subDelay: -0.1 }
  })

  const currentList = activeTab === 'series' ? SERIES_ITEMS : MOVIE_ITEMS
  const activeItem = currentList.find((i) => i.id === selectedId) || currentList[0]
  const currentProgress = mediaStates[activeItem.id]?.progressSec ?? activeItem.currentTimeSec
  const currentSubDelay = mediaStates[activeItem.id]?.subDelay ?? activeItem.subDelay

  // Playback timer tick
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setMediaStates((prev) => {
        const itemState = prev[activeItem.id] || { progressSec: activeItem.currentTimeSec, subDelay: activeItem.subDelay }
        const nextSec = itemState.progressSec >= activeItem.totalDurationSec ? 0 : itemState.progressSec + 1
        return {
          ...prev,
          [activeItem.id]: {
            ...itemState,
            progressSec: nextSec
          }
        }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isPlaying, activeItem.id, activeItem.totalDurationSec, activeItem.currentTimeSec, activeItem.subDelay])

  // Handle Tab Switch
  const handleTabSwitch = (tab: 'series' | 'movies') => {
    setActiveTab(tab)
    setIsPlaying(false)
    if (tab === 'series') {
      setSelectedId('frieren')
    } else {
      setSelectedId('oppenheimer')
    }
  }

  // Handle Item Select
  const handleItemSelect = (item: MediaItem) => {
    setSelectedId(item.id)
    setIsPlaying(false)
  }

  // Adjust Subtitle Delay
  const adjustSubDelay = (delta: number) => {
    setMediaStates((prev) => {
      const current = prev[activeItem.id] || { progressSec: activeItem.currentTimeSec, subDelay: activeItem.subDelay }
      return {
        ...prev,
        [activeItem.id]: {
          ...current,
          subDelay: Number((current.subDelay + delta).toFixed(2))
        }
      }
    })
  }

  const resetSubDelay = () => {
    setMediaStates((prev) => {
      const current = prev[activeItem.id] || { progressSec: activeItem.currentTimeSec, subDelay: activeItem.subDelay }
      return {
        ...prev,
        [activeItem.id]: {
          ...current,
          subDelay: 0.0
        }
      }
    })
  }

  // Format seconds to hh:mm:ss or mm:ss
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 3D Tilt spring animation
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const mouseX = useSpring(x, { stiffness: 150, damping: 20 })
  const mouseY = useSpring(y, { stiffness: 150, damping: 20 })

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [6, -6])
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-8, 8])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseXPos = e.clientX - rect.left
    const mouseYPos = e.clientY - rect.top
    const xPct = mouseXPos / width - 0.5
    const yPct = mouseYPos / height - 0.5
    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  const progressPercentage = Math.min(100, Math.max(0, (currentProgress / activeItem.totalDurationSec) * 100))

  return (
    <div
      style={{ perspective: 1200 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full flex justify-center py-6"
    >
      <motion.div
        style={{ rotateX, rotateY }}
        transition={{ ease: 'easeOut', duration: 0.2 }}
        className="w-full max-w-5xl rounded-3xl bg-zinc-950/90 border border-white/10 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col backdrop-blur-2xl text-left select-none relative group"
      >
        {/* Glow halo behind mockup */}
        <div className="absolute inset-0 bg-gradient-to-tr from-bifrost-amber/10 via-transparent to-cyan-500/10 pointer-events-none" />

        {/* Mockup Titlebar */}
        <div className="h-10 px-4 bg-zinc-900/80 border-b border-white/5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
            <Eye className="w-3.5 h-3.5 text-bifrost-amber" />
            <span>Heimdall — Desktop Media Companion</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">1360 × 900</div>
        </div>

        {/* Mockup App Interface */}
        <div className="flex flex-col md:flex-row min-h-[520px] overflow-hidden z-10">
          {/* Mockup Sidebar */}
          <div className="w-full md:w-64 bg-zinc-950/90 border-r border-white/5 p-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Category Tab Switcher */}
              <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('series')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'series'
                      ? 'bg-bifrost-amber text-zinc-950 shadow-md scale-[1.02]'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Tv className="w-3 h-3" />
                  <span>Series (14)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTabSwitch('movies')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'movies'
                      ? 'bg-bifrost-amber text-zinc-950 shadow-md scale-[1.02]'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Film className="w-3 h-3" />
                  <span>Movies (28)</span>
                </button>
              </div>

              {/* Interactive Sidebar Item List */}
              <div className="space-y-1.5">
                {currentList.map((item) => {
                  const isSelected = item.id === activeItem.id
                  const itemProgress = mediaStates[item.id]?.progressSec ?? item.currentTimeSec
                  const pct = Math.min(100, (itemProgress / item.totalDurationSec) * 100)

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemSelect(item)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs cursor-pointer block ${
                        isSelected
                          ? 'bg-zinc-900/90 border-bifrost-amber/50 text-white shadow-md shadow-bifrost-amber/10'
                          : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex justify-between items-center font-semibold">
                        <span className="truncate max-w-[140px]">{item.title}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                            isSelected
                              ? 'bg-bifrost-amber/20 text-bifrost-amber font-bold'
                              : 'text-zinc-500'
                          }`}
                        >
                          {item.epLabel}
                        </span>
                      </div>
                      <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isSelected ? 'bg-bifrost-amber' : 'bg-zinc-600'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Mockup Active Live Integration Pills */}
            <div className="space-y-2 pt-3 border-t border-zinc-900">
              <div className="flex items-center justify-between text-[11px] text-indigo-300 bg-indigo-950/40 border border-indigo-900/50 p-2 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Discord RPC</span>
                </div>
                <span className="font-bold text-[10px] text-indigo-400">Active</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-sky-300 bg-sky-950/40 border border-sky-900/50 p-2 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>AniList Scrobbler</span>
                </div>
                <span className="font-bold text-[10px] text-sky-400">Linked</span>
              </div>
            </div>
          </div>

          {/* Mockup Main View with Animated Transition */}
          <div className="flex-1 p-6 flex flex-col justify-between bg-gradient-to-br from-zinc-900/90 to-zinc-950">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeItem.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Header Status & Player Badges */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-bifrost-amber/15 text-bifrost-amber border border-bifrost-amber/30">
                      Watching Now
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                        activeItem.player === 'mpv'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-bifrost-amber/15 text-bifrost-amber border-bifrost-amber/30'
                      }`}
                    >
                      <Radio className="w-3 h-3 animate-pulse" />
                      {activeItem.player === 'mpv' ? 'mpv Player Active' : 'VLC Player Active'}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {activeItem.watchedLabel}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {activeItem.title}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono mt-1">
                    {activeItem.subtitle}
                  </p>
                </div>

                {/* Tech Spec Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {activeItem.badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-white/5 text-[10px] font-mono text-zinc-300"
                    >
                      {badge}
                    </span>
                  ))}
                </div>

                {/* Live Playback Bar with Interactive Seek */}
                <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                    <span className="text-white font-bold">{formatTime(currentProgress)}</span>
                    <span className="text-zinc-500">{formatTime(activeItem.totalDurationSec)} (Total)</span>
                  </div>

                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative cursor-pointer group/bar">
                    <div
                      className="h-full bg-gradient-to-r from-bifrost-amber to-amber-500 rounded-full transition-all duration-300 group-hover/bar:brightness-110"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="px-4 py-2 rounded-xl bg-bifrost-amber hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-bifrost-amber/20 active:scale-95 cursor-pointer"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-zinc-950" />
                          <span>Pause {activeItem.player}</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-zinc-950" />
                          <span>Resume in {activeItem.player}</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span className="text-[11px]">Sub Delay:</span>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded border text-xs ${
                          currentSubDelay === 0
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                        }`}
                      >
                        {currentSubDelay >= 0 ? `+${currentSubDelay.toFixed(2)}s` : `${currentSubDelay.toFixed(2)}s`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subtitle Sync Widget inside Mockup */}
                <div className="p-3 bg-zinc-950/60 border border-white/5 rounded-xl flex items-center justify-between text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-bifrost-amber/15 text-bifrost-amber">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-zinc-200">Speech Auto-Sync</span>
                      <span className="text-[10px] text-zinc-500 block">Cross-correlated to audio waveform</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjustSubDelay(-0.1)}
                      className="p-1 px-2 rounded bg-zinc-800 text-zinc-300 hover:text-white font-mono text-[11px] active:scale-95 cursor-pointer"
                    >
                      <Minus className="w-3 h-3 inline mr-0.5" /> 0.1s
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustSubDelay(0.1)}
                      className="p-1 px-2 rounded bg-zinc-800 text-zinc-300 hover:text-white font-mono text-[11px] active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 inline mr-0.5" /> 0.1s
                    </button>
                    <button
                      type="button"
                      onClick={resetSubDelay}
                      title="Reset Subtitle Delay"
                      className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 active:scale-95 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Footer status in mockup */}
            <div className="text-[11px] text-zinc-500 flex items-center justify-between pt-3 border-t border-zinc-800/40">
              <span className="font-mono truncate">
                {activeItem.player === 'mpv'
                  ? 'Connected via named pipe: \\\\.\\pipe\\heimdall-mpv'
                  : 'Connected via HTTP: http://127.0.0.1:8080'}
              </span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1 flex-shrink-0">
                <Check className="w-3 h-3" /> 0ms Latency
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
