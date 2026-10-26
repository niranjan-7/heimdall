import React, { useState, useEffect } from 'react'
import { motion, useMotionValue, useMotionTemplate, useReducedMotion } from 'framer-motion'
import { Sparkles, Sliders, Waves, CheckCircle2, RotateCcw, AlertTriangle, Play, Pause } from 'lucide-react'
import { MotionReveal } from './MotionReveal'

// Reusable Spotlight Card component for mouse-move radial spotlight glow
const SpotlightCard: React.FC<{
  children: React.ReactNode
  className?: string
  variants?: any
}> = ({ children, className = '', variants }) => {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  return (
    <motion.div
      variants={variants}
      onMouseMove={handleMouseMove}
      className={`relative group rounded-2xl p-6 glass-card border border-white/10 overflow-hidden transform-gpu ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: useMotionTemplate`radial-gradient(280px circle at ${mouseX}px ${mouseY}px, rgba(245, 158, 11, 0.16), transparent 80%)`
        }}
      />
      <div className="relative z-10 space-y-2">{children}</div>
    </motion.div>
  )
}

export const AutoSyncDemo: React.FC = () => {
  const [offsetMs, setOffsetMs] = useState<number>(1850)
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [isSynced, setIsSynced] = useState<boolean>(false)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [playhead, setPlayhead] = useState<number>(0)
  const [hasAutoDemoRun, setHasAutoDemoRun] = useState<boolean>(false)
  const [highlightShimmer, setHighlightShimmer] = useState<boolean>(false)
  const shouldReduceMotion = useReducedMotion()

  // Simulated audio playback ticker
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setPlayhead((prev) => (prev >= 100 ? 0 : prev + 1))
    }, 80)
    return () => clearInterval(interval)
  }, [isPlaying])

  // Scroll-driven auto-demo on first viewport entry
  const handleViewportEnter = () => {
    if (hasAutoDemoRun) return
    setHasAutoDemoRun(true)

    // Trigger smooth spring animation 600ms after entering the viewport
    setTimeout(() => {
      setHighlightShimmer(true)
      setIsScanning(true)
      setTimeout(() => {
        setIsScanning(false)
        setOffsetMs(0)
        setIsSynced(true)
        setTimeout(() => setHighlightShimmer(false), 2000)
      }, 1200)
    }, 600)
  }

  const triggerAutoSync = () => {
    setIsScanning(true)
    setHighlightShimmer(true)
    setTimeout(() => {
      setIsScanning(false)
      setOffsetMs(0)
      setIsSynced(true)
      setTimeout(() => setHighlightShimmer(false), 1500)
    }, 1200)
  }

  const resetDemo = () => {
    setOffsetMs(1850)
    setIsSynced(false)
    setIsScanning(false)
    setHighlightShimmer(false)
  }

  const nudge = (delta: number) => {
    setOffsetMs((prev) => {
      const next = prev + delta
      setIsSynced(Math.abs(next) < 50)
      return next
    })
  }

  // Audio wave speech intervals (normalized 0 to 100)
  const speechPeaks = [
    { start: 15, end: 32, label: '“Now I am become Death...”' },
    { start: 45, end: 72, label: '“...the destroyer of worlds.”' },
    { start: 80, end: 95, label: '[Heavy orchestral crescendo]' }
  ]

  // Calculate subtitle visual position based on offsetMs
  // In our visual timeline, 1000ms = 12% shift
  const subtitleShiftPercent = (offsetMs / 1000) * 12

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12
      }
    }
  }

  const cardVariants = {
    hidden: { y: 35, opacity: 0, scale: 0.96 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 20
      }
    }
  }

  return (
    <motion.section
      id="auto-sync"
      onViewportEnter={handleViewportEnter}
      viewport={{ amount: 0.4, once: true }}
      className="py-24 relative overflow-hidden"
    >
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[550px] h-[350px] bg-bifrost-amber/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-bifrost-cyan/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header with Masked Upward Slide-In */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <MotionReveal>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card border-bifrost-amber/30 text-bifrost-amber text-xs font-semibold">
              <Waves className="w-3.5 h-3.5 text-bifrost-amber" />
              <span>Module 1 • Intelligent Waveform Correlation</span>
            </div>
          </MotionReveal>

          <MotionReveal delay={0.1}>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Fix Subtitle Desync in <span className="bg-gradient-to-r from-bifrost-amber to-amber-400 bg-clip-text text-transparent">One Click</span>.
            </h2>
          </MotionReveal>

          <MotionReveal delay={0.2}>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Downloaded a movie with out-of-sync subtitles? Heimdall runs an embedded FFmpeg voice-energy pass against subtitle cue timestamps and calculates the cross-correlation peak. No guessing, no frustration.
            </p>
          </MotionReveal>
        </div>

        {/* Interactive Timeline Visualizer Card */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { y: 40, opacity: 0, scale: 0.98 }}
          whileInView={{ y: 0, opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-2xl space-y-6 transform-gpu"
        >
          {/* Visualizer Top Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-white/5 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-bifrost-amber/15 border border-bifrost-amber/30 flex items-center justify-center text-bifrost-amber font-bold">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
                  <span>Audio & Subtitle Timeline</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-white/5">
                    Oppenheimer (2023) • 01:42:15
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Dual-track audio voice envelope vs. subtitle timestamp alignment
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              {/* Reset button */}
              <button
                onClick={resetDemo}
                className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Reset simulation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Play/Pause */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              {/* Status Badge */}
              <div
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                  isSynced
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {isSynced ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>0ms Synced</span>
                  </>
                ) : (
                  <motion.div
                    animate={
                      shouldReduceMotion
                        ? { opacity: 1 }
                        : { opacity: [0.7, 1, 0.7], scale: [1, 1.04, 1] }
                    }
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Subtitle Lag: +{offsetMs}ms</span>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline Tracks Box */}
          <div className="space-y-4 pt-2 relative">
            {/* Playhead vertical line sweeping across */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-bifrost-amber z-20 pointer-events-none transition-all duration-75 ease-linear shadow-[0_0_8px_rgba(245,158,11,0.8)]"
              style={{ left: `${playhead}%` }}
            >
              <div className="w-2.5 h-2.5 -ml-1 -top-1 absolute rounded-full bg-bifrost-amber shadow-md" />
            </div>

            {/* Track 1: Audio Speech Energy Waveform (Cyan) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                <span className="flex items-center gap-2">
                  <Waves className="w-3.5 h-3.5 text-bifrost-cyan" />
                  <span className="text-zinc-200">Audio Speech Envelope (FFmpeg Energy Peaks)</span>
                </span>
                <span className="font-mono text-zinc-500">48kHz • 5.1 AAC</span>
              </div>
              <div className="h-16 w-full bg-zinc-950/80 rounded-2xl border border-white/5 relative overflow-hidden flex items-center px-4">
                {/* Simulated Waveform Bars */}
                <div className="flex items-center justify-between w-full h-10 gap-0.5 sm:gap-1 opacity-70">
                  {Array.from({ length: 64 }).map((_, i) => {
                    const isInPeak = speechPeaks.some(
                      (p) => i >= (p.start / 100) * 64 && i <= (p.end / 100) * 64
                    )
                    const heightPercent = isInPeak
                      ? 45 + Math.sin(i * 1.5) * 35 + ((i % 5) * 4)
                      : 8 + (i % 3) * 4
                    return (
                      <div
                        key={i}
                        className={`w-full rounded-full transition-all duration-300 ${
                          isInPeak ? 'bg-bifrost-cyan shadow-sm shadow-bifrost-cyan/50' : 'bg-zinc-700'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    )
                  })}
                </div>

                {/* Speech labels */}
                {speechPeaks.map((peak, idx) => (
                  <div
                    key={idx}
                    className="absolute bottom-1 text-[10px] font-mono font-medium text-bifrost-cyan/80 bg-zinc-900/80 px-2 py-0.5 rounded border border-bifrost-cyan/20"
                    style={{ left: `${peak.start}%` }}
                  >
                    Speech detected
                  </div>
                ))}
              </div>
            </div>

            {/* Track 2: Subtitle Cue Track (Misaligned or Synced) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
                <span className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-bifrost-amber" />
                  <span className="text-zinc-200">Subtitle (.srt / .ass) Waveform Cues</span>
                  <span
                    className={`font-mono text-[11px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                      offsetMs === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {offsetMs === 0 ? '0.00s offset' : `+${(offsetMs / 1000).toFixed(2)}s lag`}
                  </span>
                </span>
                <span className="font-mono text-zinc-500">UTF-8 SubRip</span>
              </div>

              <div className="h-16 w-full bg-zinc-950/80 rounded-2xl border border-white/5 relative overflow-hidden flex items-center">
                {/* Motion container shifting subtitle cues with spring physics */}
                <motion.div
                  className="absolute inset-0 flex items-center"
                  animate={{ x: `${subtitleShiftPercent}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 16 }}
                >
                  {speechPeaks.map((peak, idx) => (
                    <div
                      key={idx}
                      className="absolute h-9 rounded-xl bg-gradient-to-r from-bifrost-amber/30 to-amber-500/40 border border-bifrost-amber/60 flex items-center px-3 shadow-md shadow-bifrost-amber/10 group cursor-pointer hover:border-bifrost-amber"
                      style={{
                        left: `${peak.start}%`,
                        width: `${peak.end - peak.start}%`
                      }}
                    >
                      <span className="text-[11px] font-semibold text-amber-200 truncate group-hover:text-white">
                        {peak.label}
                      </span>
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </div>

          {/* Interactive Control Deck */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4 border-t border-white/5">
            {/* Auto-Sync Main Trigger with Shimmer Highlight */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={triggerAutoSync}
                disabled={isScanning || isSynced}
                className={`relative overflow-hidden w-full md:w-auto px-6 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg ${
                  isSynced
                    ? 'bg-zinc-800 text-zinc-400 cursor-default border border-white/5'
                    : isScanning
                    ? 'bg-bifrost-amber/60 text-zinc-950 cursor-wait'
                    : highlightShimmer
                    ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-zinc-950 shadow-bifrost-amber/40 scale-105'
                    : 'bg-gradient-to-r from-bifrost-amber to-amber-600 hover:from-amber-400 hover:to-bifrost-amber text-zinc-950 shadow-bifrost-amber/20 hover:scale-105 active:scale-95 cursor-pointer'
                }`}
              >
                {/* Shimmer beam effect */}
                {highlightShimmer && (
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
                  />
                )}
                <Sparkles className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning
                  ? 'Analyzing Audio Waveform...'
                  : isSynced
                  ? 'Subtitles Perfectly Synced!'
                  : '⚡ Auto-Align Subtitles'}
              </button>

              <span className="text-xs text-zinc-500 hidden sm:inline font-mono">
                FFmpeg Speech Correlation
              </span>
            </div>

            {/* Micro-Nudge Buttons (Preserved Manual Precision) */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <span className="text-xs text-zinc-400 font-medium mr-1">Micro-Nudge:</span>
              <button
                onClick={() => nudge(-250)}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium border border-white/5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                -250ms
              </button>
              <button
                onClick={() => nudge(-50)}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium border border-white/5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                -50ms
              </button>
              <div className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-white/10 text-xs font-mono font-bold text-bifrost-amber min-w-[70px] text-center">
                {offsetMs >= 0 ? `+${offsetMs}` : offsetMs}ms
              </div>
              <button
                onClick={() => nudge(50)}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium border border-white/5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                +50ms
              </button>
              <button
                onClick={() => nudge(250)}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium border border-white/5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                +250ms
              </button>
            </div>
          </div>
        </motion.div>

        {/* 3 Bottom Feature Cards with Staggered Entrance & Mouse-move Radial Spotlight Glow */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8"
        >
          <SpotlightCard variants={cardVariants}>
            <h4 className="text-white font-bold text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-bifrost-amber shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              Speech Envelope FFT
            </h4>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Extracts high-energy vocal frequencies (300Hz - 3.4kHz) from local media files without requiring cloud transcription APIs.
            </p>
          </SpotlightCard>

          <SpotlightCard variants={cardVariants}>
            <h4 className="text-white font-bold text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-bifrost-cyan shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              Cross-Correlation Peak
            </h4>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Calculates Pearson correlation between audio voice energy and subtitle text timestamps to detect exact drift to the millisecond.
            </p>
          </SpotlightCard>

          <SpotlightCard variants={cardVariants}>
            <h4 className="text-white font-bold text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
              Zero Video Re-encoding
            </h4>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Dispatches non-destructive real-time offset commands straight to VLC HTTP API or mpv IPC socket instantly during playback.
            </p>
          </SpotlightCard>
        </motion.div>
      </div>
    </motion.section>
  )
}
