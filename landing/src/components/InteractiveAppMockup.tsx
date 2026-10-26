import React, { useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Eye, Radio, Sparkles, MessageSquare, Play, RotateCcw, Minus, Plus, Check, Zap } from 'lucide-react'

export const InteractiveAppMockup: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progressSec, setProgressSec] = useState(842)
  const [subDelay, setSubDelay] = useState(0.35)
  const [activeTab, setActiveTab] = useState<'series' | 'movies'>('series')

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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`
  }

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
        <div className="h-10 px-4 bg-zinc-900/80 border-b border-surface-border flex items-center justify-between z-10">
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
        <div className="flex flex-col md:flex-row h-[500px] overflow-hidden z-10">
          {/* Mockup Sidebar */}
          <div className="w-64 bg-zinc-950 border-r border-surface-border p-4 flex flex-col justify-between hidden md:flex">
            <div className="space-y-4">
              <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('series')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'series'
                      ? 'bg-bifrost-amber text-zinc-950 shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Series (14)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('movies')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'movies'
                      ? 'bg-bifrost-amber text-zinc-950 shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Movies (28)
                </button>
              </div>

              {/* Sidebar items */}
              <div className="space-y-1.5">
                {[
                  { title: "Frieren: Beyond Journey's End", ep: 'Ep 18', active: true, progress: 65 },
                  { title: 'Dungeon Meshi', ep: 'Ep 24', active: false, progress: 100 },
                  { title: 'Oshi no Ko Season 2', ep: 'Ep 11', active: false, progress: 92 },
                  { title: 'Oppenheimer (2023)', ep: 'Movie', active: false, progress: 40 }
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-xl border transition-all text-xs ${
                      item.active
                        ? 'bg-zinc-900/90 border-bifrost-amber/40 text-zinc-100'
                        : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/40'
                    }`}
                  >
                    <div className="flex justify-between items-center font-semibold">
                      <span className="truncate max-w-[140px]">{item.title}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{item.ep}</span>
                    </div>
                    <div className="mt-1.5 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-bifrost-amber rounded-full"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
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

          {/* Mockup Main View */}
          <div className="flex-1 p-6 flex flex-col justify-between bg-gradient-to-br from-zinc-900/90 to-zinc-950">
            {/* Hero Card */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-bifrost-amber/15 text-bifrost-amber border border-bifrost-amber/30">
                    Watching Now
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 animate-pulse">
                    <Radio className="w-3 h-3" />
                    mpv Player Active
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 font-mono">18 of 28 watched (64%)</span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  Frieren: Beyond Journey&apos;s End
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Episode 18 — Well-Laid Plans
                </p>
              </div>

              {/* Live Playback Bar with Interactive Seek */}
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                  <span>{formatTime(progressSec)}</span>
                  <span className="text-zinc-500">24:00 (Total)</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-bifrost-amber to-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${(progressSec / 1440) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlaying(!isPlaying)
                      if (!isPlaying) setProgressSec((p) => p + 60)
                    }}
                    className="px-4 py-2 rounded-xl bg-bifrost-amber hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-bifrost-amber/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-zinc-950" />
                    <span>{isPlaying ? 'Pause' : 'Resume in mpv'}</span>
                  </button>

                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="text-[11px]">Sub Delay:</span>
                    <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      +{subDelay.toFixed(2)}s
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
                    <span className="text-[10px] text-zinc-500 block">Cross-correlated to audio</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSubDelay((d) => Math.max(-2, d - 0.1))}
                    className="p-1 px-2 rounded bg-zinc-800 text-zinc-300 hover:text-white font-mono text-[11px]"
                  >
                    <Minus className="w-3 h-3 inline mr-0.5" /> 0.1s
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubDelay((d) => Math.min(2, d + 0.1))}
                    className="p-1 px-2 rounded bg-zinc-800 text-zinc-300 hover:text-white font-mono text-[11px]"
                  >
                    <Plus className="w-3 h-3 inline mr-0.5" /> 0.1s
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubDelay(0)}
                    className="p-1.5 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer status in mockup */}
            <div className="text-[11px] text-zinc-500 flex items-center justify-between pt-2 border-t border-zinc-800/40">
              <span>Connected via named pipe: \\.\pipe\heimdall-mpv</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" /> 0ms Latency
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
