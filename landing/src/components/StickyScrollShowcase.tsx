import React, { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence, useScroll, useSpring, useTransform, useReducedMotion } from 'framer-motion'
import { Cpu, Waves, Smartphone, Activity, CheckCircle2, Wifi, Volume2, Play, Terminal } from 'lucide-react'

interface StoryChapter {
  id: number
  pill: string
  title: string
  highlight: string
  description: string
  icon: React.ReactNode
  color: string
}

const CHAPTERS: StoryChapter[] = [
  {
    id: 0,
    pill: 'PILLAR 01 // LOW-LATENCY IPC HANDSHAKE',
    title: 'Zero Latency.',
    highlight: 'Direct Player Socket Binding.',
    description:
      'Heimdall binds directly to native mpv Named Pipes (\\\\.\\pipe\\heimdall-mpv) and VLC HTTP endpoints. No polling lag, no CPU strain—instantaneous event push the exact millisecond you hit seek or pause.',
    icon: <Cpu className="w-4 h-4 text-teal-400" />,
    color: 'border-teal-500/40 text-teal-300 bg-teal-500/10'
  },
  {
    id: 1,
    pill: 'PILLAR 02 // SPEECH ENVELOPE CORRELATION',
    title: 'Automated Sync.',
    highlight: 'Fourier Audio Wave Matching.',
    description:
      'Say goodbye to guessing subtitle drift. Embedded FFmpeg extracts speech frequencies (300Hz - 3.4kHz) from the audio stream and calculates cross-correlation peaks to snap desynced dialogue into atomic alignment.',
    icon: <Waves className="w-4 h-4 text-amber-400" />,
    color: 'border-amber-500/40 text-amber-300 bg-amber-500/10'
  },
  {
    id: 2,
    pill: 'PILLAR 03 // ZERO-INSTALL COUCH REMOTE',
    title: 'Instant Control.',
    highlight: 'Point Camera & Lean Back.',
    description:
      'Hosts a lightning-fast local HTTP + Server-Sent Events server directly on your Wi-Fi LAN (port 42125). Scan the QR code from your sofa to adjust volume, scrub playback, and nudge subtitles right from your phone.',
    icon: <Smartphone className="w-4 h-4 text-emerald-400" />,
    color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
  }
]

export const StickyScrollShowcase: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end']
  })

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 24,
    restDelta: 0.001
  })

  const [activeStep, setActiveStep] = useState<number>(0)

  useEffect(() => {
    return scrollYProgress.on('change', (latest) => {
      if (latest < 0.33) {
        setActiveStep(0)
      } else if (latest < 0.66) {
        setActiveStep(1)
      } else {
        setActiveStep(2)
      }
    })
  }, [scrollYProgress])

  // Parallax offsets for background elements
  const bgScale = useTransform(smoothProgress, [0, 1], [0.95, 1.1])
  const cardRotate = useTransform(smoothProgress, [0, 0.5, 1], [-2, 0, 2])
  const continuousBarWidth = useTransform(smoothProgress, [0, 1], ['0%', '100%'])

  return (
    <section
      id="story-showcase"
      ref={containerRef}
      className="relative h-[300vh] bg-[#07080d]/90"
    >
      {/* Sticky Viewport Container */}
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden px-6">
        {/* Ambient background glow scaling with scroll */}
        <motion.div
          style={{ scale: shouldReduceMotion ? 1 : bgScale }}
          className="absolute w-[750px] h-[520px] bg-gradient-to-tr from-amber-500/10 via-teal-500/10 to-purple-600/10 rounded-full blur-[170px] pointer-events-none transform-gpu"
        />

        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">
          {/* Left Column: Story Navigation & Dynamic Copy */}
          <div className="lg:col-span-6 space-y-8">
            {/* Step indicators with continuous scroll scrub progress fill */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {CHAPTERS.map((_, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        activeStep === idx
                          ? 'w-14 bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                          : activeStep > idx
                          ? 'w-6 bg-zinc-600'
                          : 'w-4 bg-zinc-800'
                      }`}
                    />
                  </div>
                ))}
                <span className="text-xs font-mono font-bold text-amber-300 ml-2">
                  PHASE 0{activeStep + 1} // 03
                </span>
              </div>

              {/* Continuous Scrubbing Progress Track with Sequencer Ticks */}
              <div className="w-64 h-1.5 rounded-full bg-zinc-900 border border-white/[0.08] p-0.5 overflow-hidden relative">
                <motion.div
                  style={{ width: shouldReduceMotion ? `${(activeStep + 1) * 33}%` : continuousBarWidth }}
                  className="h-full bg-gradient-to-r from-teal-400 via-amber-400 to-emerald-400 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                />
              </div>
            </div>

            {/* Dynamic Content Card with Cross-Fade + Motion Blur */}
            <div className="min-h-[260px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: 25, filter: 'blur(6px)' }
                  }
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: -25, filter: 'blur(6px)' }
                  }
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="space-y-4"
                >
                  <div
                    className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-bold font-mono shadow-sm ${CHAPTERS[activeStep].color}`}
                  >
                    {CHAPTERS[activeStep].icon}
                    <span>{CHAPTERS[activeStep].pill}</span>
                  </div>

                  <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                    {CHAPTERS[activeStep].title} <br />
                    <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                      {CHAPTERS[activeStep].highlight}
                    </span>
                  </h3>

                  <p className="text-zinc-300 text-sm sm:text-base leading-relaxed max-w-lg">
                    {CHAPTERS[activeStep].description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Scroll Hint with telemetry ping */}
            <div className="pt-2 text-xs text-zinc-400 font-mono flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
              <span>Scroll down to advance high-fidelity pipeline</span>
            </div>
          </div>

          {/* Right Column: Reactive Visual Showcase Card with Studio Deck Styling */}
          <div className="lg:col-span-6 flex justify-center [perspective:1000px]">
            <motion.div
              style={{ rotate: shouldReduceMotion ? 0 : cardRotate }}
              className="w-full max-w-lg glass-panel rounded-3xl border border-white/[0.12] p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative overflow-hidden backdrop-blur-2xl transform-gpu"
            >
              {/* Studio Deck Status LEDs at Top */}
              <div className="absolute top-3.5 right-6 flex items-center gap-2 font-mono text-[9px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> PWR
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> RX/TX
                </span>
              </div>

              <AnimatePresence mode="wait">
                {/* Stage 01: Windows Named Pipe IPC */}
                {activeStep === 0 && (
                  <motion.div
                    key="step-0"
                    initial={{ opacity: 0, scale: 0.95, rotateY: -6 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    exit={{ opacity: 0, scale: 0.95, rotateY: 6 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    className="space-y-4 transform-gpu"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.07] text-xs font-mono">
                      <span className="text-zinc-300 flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-teal-400" />
                        IPC_PIPELINE // Windows Named Pipe
                      </span>
                      <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                        <Activity className="w-3.5 h-3.5 animate-pulse" />
                        0ms Connected
                      </span>
                    </div>

                    {/* Staggered Typewriter Terminal Simulation */}
                    <div className="p-4 rounded-2xl bg-black/80 border border-white/[0.08] font-mono text-xs space-y-2.5 text-zinc-300 shadow-inner">
                      <div className="flex items-center justify-between pb-2 border-b border-white/5 text-[10px] text-zinc-500">
                        <span>PIPE: \\.\pipe\heimdall-mpv</span>
                        <span>ASYNC WORKER</span>
                      </div>
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                        className="text-zinc-400"
                      >
                        <span className="text-amber-400">$</span> binding socket to IPC endpoint...
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25, duration: 0.3 }}
                        className="text-emerald-400"
                      >
                        <span className="text-zinc-500">&gt;</span> [IPC HANDSHAKE] mpv v0.38-dev initialized
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4, duration: 0.3 }}
                        className="text-teal-300"
                      >
                        <span className="text-zinc-500">&gt;</span> observing events: time-pos, duration, pause
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.55, duration: 0.3 }}
                        className="flex items-center justify-between pt-2 border-t border-zinc-800 text-[11px]"
                      >
                        <span className="text-zinc-400">Push Event Overhead:</span>
                        <span className="text-amber-400 font-bold">&lt; 0.38 ms</span>
                      </motion.div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/[0.06] text-xs">
                        <span className="text-zinc-500 block text-[10px] font-mono">SUPPORTED ENGINES</span>
                        <span className="font-bold text-white">mpv Player + VLC</span>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/[0.06] text-xs">
                        <span className="text-zinc-500 block text-[10px] font-mono">CPU OVERHEAD</span>
                        <span className="font-bold text-emerald-400">0% (Pure Async Push)</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Stage 02: FFmpeg Speech Correlation */}
                {activeStep === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, scale: 0.95, rotateY: -6 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    exit={{ opacity: 0, scale: 0.95, rotateY: 6 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    className="space-y-4 transform-gpu"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.07] text-xs font-mono">
                      <span className="text-zinc-300 flex items-center gap-2">
                        <Waves className="w-4 h-4 text-amber-400" />
                        FFmpeg Speech Correlation
                      </span>
                      <span className="text-amber-300 font-bold font-mono">
                        Confidence 99.4%
                      </span>
                    </div>

                    {/* Audio Waveform Graphic with Frequency Ruler */}
                    <div className="h-32 rounded-2xl bg-black/80 border border-white/[0.08] p-4 flex flex-col justify-between overflow-hidden relative shadow-inner">
                      {/* Top Frequency Labels */}
                      <div className="flex justify-between text-[9px] font-mono text-zinc-500 border-b border-white/5 pb-1">
                        <span>300 Hz (Voice Bass)</span>
                        <span>1.5 kHz (Formant)</span>
                        <span>3.4 kHz (Sibilance)</span>
                      </div>

                      {/* Waveform Bars */}
                      <div className="flex items-center justify-between gap-1 h-14">
                        {Array.from({ length: 32 }).map((_, i) => {
                          const baseH = 20 + Math.sin(i * 0.7) * 40 + ((i % 5) * 8)
                          const peakH = Math.min(100, baseH + 35)
                          const troughH = Math.max(15, baseH - 25)
                          return (
                            <motion.div
                              key={i}
                              animate={
                                shouldReduceMotion
                                  ? { height: `${baseH}%` }
                                  : {
                                      height: [`${baseH}%`, `${peakH}%`, `${troughH}%`, `${baseH}%`]
                                    }
                              }
                              transition={{
                                duration: 1.2 + (i % 6) * 0.2,
                                repeat: Infinity,
                                ease: 'easeInOut'
                              }}
                              className="w-full bg-gradient-to-t from-amber-500/40 via-amber-400 to-amber-300 rounded-full"
                            />
                          )
                        })}
                      </div>

                      <div className="text-center">
                        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-zinc-900/90 text-amber-200 border border-amber-500/30 shadow-md">
                          Subtitle Drift: +0.00s (Phase Matched)
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/[0.06] flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-400">Peak Detection</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aligned in 1.2s
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Stage 03: Local Couch Remote */}
                {activeStep === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, scale: 0.95, rotateY: -6 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    exit={{ opacity: 0, scale: 0.95, rotateY: 6 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    className="space-y-4 transform-gpu"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.07] text-xs font-mono">
                      <span className="text-zinc-300 flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-emerald-400" />
                        HTTP + SSE Server // LAN Remote
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>0ms SSE Synced</span>
                      </span>
                    </div>

                    {/* Mobile Remote Mini-Card with animated progress */}
                    <div className="p-4 rounded-2xl bg-black/80 border border-white/[0.08] space-y-3 shadow-inner">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">Dune: Part Two (2024)</div>
                          <div className="text-[10px] text-zinc-400">Living Room TV • mpv</div>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-zinc-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/30">
                          <Play className="w-4 h-4 fill-zinc-950" />
                        </div>
                      </div>

                      {/* Animated playback scrubber */}
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative">
                        <motion.div
                          animate={shouldReduceMotion ? { width: '65%' } : { width: ['60%', '75%'] }}
                          transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full"
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Volume2 className="w-3 h-3 text-amber-400" /> 75% Master Volume
                        </span>
                        <span className="text-emerald-400 font-semibold">PWA Stream Active</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/[0.06] flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-400">LAN Routing</span>
                      <span className="text-zinc-200 font-bold">100% Local • Zero Cloud</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
