import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Sliders, Waves, CheckCircle2, RotateCcw, AlertTriangle, Play, Pause } from 'lucide-react'

export const AutoSyncDemo: React.FC = () => {
  const [offsetMs, setOffsetMs] = useState<number>(1850)
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [isSynced, setIsSynced] = useState<boolean>(false)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [playhead, setPlayhead] = useState<number>(0)

  // Simulated audio playback ticker
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setPlayhead((prev) => (prev >= 100 ? 0 : prev + 1))
    }, 80)
    return () => clearInterval(interval)
  }, [isPlaying])

  const triggerAutoSync = () => {
    setIsScanning(true)
    setTimeout(() => {
      setIsScanning(false)
      setOffsetMs(0)
      setIsSynced(true)
    }, 1400)
  }

  const resetDemo = () => {
    setOffsetMs(1850)
    setIsSynced(false)
    setIsScanning(false)
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

  return (
    <section id="auto-sync" className="py-24 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[550px] h-[350px] bg-bifrost-amber/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-bifrost-cyan/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card border-bifrost-amber/30 text-bifrost-amber text-xs font-semibold">
            <Waves className="w-3.5 h-3.5 text-bifrost-amber" />
            <span>Module 1 • Intelligent Waveform Correlation</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Fix Subtitle Desync in <span className="bg-gradient-to-r from-bifrost-amber to-amber-400 bg-clip-text text-transparent">One Click</span>.
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Never fiddle with VLC’s <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-xs">G</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-xs">H</kbd> keys again. Heimdall extracts speech envelopes from the film’s audio track and cross-correlates timestamps to snap subtitles into atomic alignment.
          </p>
        </div>

        {/* Interactive Visualizer Canvas */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 relative shadow-2xl backdrop-blur-2xl">
          {/* Top Bar / Status */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center transition-colors border border-white/5"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Audio & Subtitle Timeline</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-normal">
                    Oppenheimer.2023.2160p.mkv
                  </span>
                </h4>
                <p className="text-xs text-zinc-400">
                  {isPlaying ? 'Simulating real-time media playback stream' : 'Timeline paused'}
                </p>
              </div>
            </div>

            {/* Sync Status Badge */}
            <div className="flex items-center gap-3">
              <div
                className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
                  isSynced
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : isScanning
                    ? 'bg-bifrost-amber/10 border-bifrost-amber/30 text-bifrost-amber animate-pulse'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {isSynced ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Synchronized (0ms Drift • 99.4% Match)</span>
                  </>
                ) : isScanning ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-bifrost-amber animate-spin" />
                    <span>Cross-correlating 120 FFT speech windows...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span>Subtitle Lag: +{offsetMs} ms</span>
                  </>
                )}
              </div>

              <button
                onClick={resetDemo}
                title="Reset to desynced state"
                className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Timelines Container */}
          <div className="my-8 space-y-6 relative">
            {/* Playhead vertical line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-bifrost-amber z-20 pointer-events-none transition-all duration-75 shadow-[0_0_12px_#f59e0b]"
              style={{ left: `${playhead}%` }}
            >
              <div className="w-2.5 h-2.5 -top-1 -translate-x-[4px] bg-bifrost-amber rounded-full absolute" />
            </div>

            {/* Track 1: Audio Speech Envelope */}
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
                  <span className="text-zinc-200">Subtitle Cues (.SRT / .ASS)</span>
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.2 rounded ${
                      offsetMs === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {offsetMs === 0 ? '0.00s offset' : `+${(offsetMs / 1000).toFixed(2)}s lag`}
                  </span>
                </span>
                <span className="font-mono text-zinc-500">UTF-8 SubRip</span>
              </div>

              <div className="h-16 w-full bg-zinc-950/80 rounded-2xl border border-white/5 relative overflow-hidden flex items-center">
                {/* Motion container shifting subtitle cues */}
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
            {/* Auto-Sync Main Trigger */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={triggerAutoSync}
                disabled={isScanning || isSynced}
                className={`w-full md:w-auto px-6 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg ${
                  isSynced
                    ? 'bg-zinc-800 text-zinc-400 cursor-default border border-white/5'
                    : isScanning
                    ? 'bg-bifrost-amber/60 text-zinc-950 cursor-wait'
                    : 'bg-gradient-to-r from-bifrost-amber to-amber-600 hover:from-amber-400 hover:to-bifrost-amber text-zinc-950 shadow-bifrost-amber/20 hover:scale-105 active:scale-95'
                }`}
              >
                <Sparkles className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning
                  ? 'Analyzing Audio Waveform...'
                  : isSynced
                  ? 'Subtitles Perfectly Synced!'
                  : '⚡ Auto-Align Subtitles'}
              </button>

              <span className="text-xs text-zinc-500 hidden sm:inline">
                Instant FFmpeg cross-correlation
              </span>
            </div>

            {/* Micro-Nudge Buttons (Manual Precision) */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <span className="text-xs text-zinc-400 font-medium mr-1">Micro-Nudge:</span>
              <button
                onClick={() => nudge(-250)}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium border border-white/5 transition-all hover:scale-105 active:scale-95"
              >
                -250ms
              </button>
              <button
                onClick={() => nudge(-50)}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium border border-white/5 transition-all hover:scale-105 active:scale-95"
              >
                -50ms
              </button>
              <div className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-white/10 text-xs font-mono font-bold text-bifrost-amber min-w-[70px] text-center">
                {offsetMs >= 0 ? `+${offsetMs}` : offsetMs}ms
              </div>
              <button
                onClick={() => nudge(50)}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium border border-white/5 transition-all hover:scale-105 active:scale-95"
              >
                +50ms
              </button>
              <button
                onClick={() => nudge(250)}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium border border-white/5 transition-all hover:scale-105 active:scale-95"
              >
                +250ms
              </button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-2">
            <h4 className="text-white font-bold text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-bifrost-amber" />
              Speech Envelope FFT
            </h4>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Extracts high-energy vocal frequencies (300Hz - 3.4kHz) from local media files without requiring cloud transcription APIs.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-2">
            <h4 className="text-white font-bold text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-bifrost-cyan" />
              Cross-Correlation Peak
            </h4>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Calculates Pearson correlation between audio voice energy and subtitle text timestamps to detect exact drift to the millisecond.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-2">
            <h4 className="text-white font-bold text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Zero Video Re-encoding
            </h4>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Dispatches non-destructive real-time offset commands straight to VLC HTTP API or mpv IPC socket instantly during playback.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
