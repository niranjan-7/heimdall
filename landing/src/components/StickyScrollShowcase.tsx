import React, { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useSpring, useTransform, useReducedMotion } from 'framer-motion'
import { Cpu, Waves, Smartphone, Activity, CheckCircle2, Wifi, Volume2, Play } from 'lucide-react'

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
    pill: 'PILLAR 01 • LOW-LATENCY IPC HANDSHAKE',
    title: 'Zero Latency.',
    highlight: 'Direct Player Socket Binding.',
    description:
      'Heimdall binds directly to native mpv Named Pipes (\\\\.\\pipe\\heimdall-mpv) and VLC HTTP endpoints. No polling lag, no CPU strain—instantaneous event push the exact millisecond you hit seek or pause.',
    icon: <Cpu className="w-4 h-4 text-bifrost-cyan" />,
    color: 'border-bifrost-cyan/40 text-bifrost-cyan'
  },
  {
    id: 1,
    pill: 'PILLAR 02 • SPEECH ENVELOPE CORRELATION',
    title: 'Automated Sync.',
    highlight: 'Fourier Audio Wave Matching.',
    description:
      'Say goodbye to guessing subtitle drift. Embedded FFmpeg extracts speech frequencies (300Hz - 3.4kHz) from the audio stream and calculates cross-correlation peaks to snap desynced dialogue into atomic alignment.',
    icon: <Waves className="w-4 h-4 text-bifrost-amber" />,
    color: 'border-bifrost-amber/40 text-bifrost-amber'
  },
  {
    id: 2,
    pill: 'PILLAR 03 • ZERO-INSTALL COUCH REMOTE',
    title: 'Instant Control.',
    highlight: 'Point Camera & Lean Back.',
    description:
      'Hosts a lightning-fast local HTTP + Server-Sent Events server directly on your Wi-Fi LAN (port 42125). Scan the QR code from your sofa to adjust volume, scrub playback, and nudge subtitles right from your phone.',
    icon: <Smartphone className="w-4 h-4 text-emerald-400" />,
    color: 'border-emerald-500/40 text-emerald-400'
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
    stiffness: 120,
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

  return (
    <section
      id="story-showcase"
      ref={containerRef}
      className="relative h-[280vh] bg-obsidian-950/80"
    >
      {/* Sticky Viewport Container */}
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden px-6">
        {/* Ambient background glow scaling with scroll */}
        <motion.div
          style={{ scale: shouldReduceMotion ? 1 : bgScale }}
          className="absolute w-[700px] h-[500px] bg-gradient-to-tr from-bifrost-amber/10 via-bifrost-cyan/10 to-purple-500/10 rounded-full blur-[160px] pointer-events-none transform-gpu"
        />

        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">
          {/* Left Column: Story Navigation & Dynamic Copy */}
          <div className="lg:col-span-6 space-y-8">
            {/* Step indicators */}
            <div className="flex items-center gap-3">
              {CHAPTERS.map((_, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      activeStep === idx
                        ? 'w-12 bg-bifrost-amber'
                        : activeStep > idx
                        ? 'w-6 bg-zinc-600'
                        : 'w-4 bg-zinc-800'
                    }`}
                  />
                </div>
              ))}
              <span className="text-xs font-mono text-zinc-500 ml-2">
                0{activeStep + 1} / 03
              </span>
            </div>

            {/* Dynamic Content Card */}
            <div className="min-h-[240px] flex flex-col justify-center">
              <motion.div
                key={activeStep}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="space-y-4"
              >
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card border text-xs font-bold font-mono ${CHAPTERS[activeStep].color}`}
                >
                  {CHAPTERS[activeStep].icon}
                  <span>{CHAPTERS[activeStep].pill}</span>
                </div>

                <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                  {CHAPTERS[activeStep].title} <br />
                  <span className="bg-gradient-to-r from-bifrost-amber via-amber-300 to-amber-500 bg-clip-text text-transparent">
                    {CHAPTERS[activeStep].highlight}
                  </span>
                </h3>

                <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-lg">
                  {CHAPTERS[activeStep].description}
                </p>
              </motion.div>
            </div>

            {/* Scroll Hint */}
            <div className="pt-2 text-xs text-zinc-500 font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-bifrost-amber animate-ping" />
              <span>Scroll down to advance architectural workflow</span>
            </div>
          </div>

          {/* Right Column: Reactive Visual Showcase Card */}
          <div className="lg:col-span-6 flex justify-center">
            <motion.div
              style={{ rotate: shouldReduceMotion ? 0 : cardRotate }}
              className="w-full max-w-lg glass-panel rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-2xl transform-gpu"
            >
              {/* Dynamic View by Step */}
              {activeStep === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs font-mono">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-bifrost-cyan" />
                      IPC Protocol: Windows Named Pipe
                    </span>
                    <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                      <Activity className="w-3.5 h-3.5 animate-pulse" />
                      0ms Connected
                    </span>
                  </div>

                  {/* Terminal Simulation */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 font-mono text-xs space-y-2 text-zinc-300">
                    <div className="text-zinc-500">&gt; Binding socket: \\.\pipe\heimdall-mpv</div>
                    <div className="text-emerald-400">&gt; [IPC HANDSHAKE] mpv v0.38-dev initialized</div>
                    <div className="text-cyan-400">&gt; Observing properties: time-pos, duration, pause</div>
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-[11px]">
                      <span className="text-zinc-400">Push Event Overhead:</span>
                      <span className="text-bifrost-amber font-bold">&lt; 0.38 ms</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 text-xs">
                      <span className="text-zinc-500 block">ENGINE</span>
                      <span className="font-bold text-white">mpv + VLC</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 text-xs">
                      <span className="text-zinc-500 block">POLLING OVERHEAD</span>
                      <span className="font-bold text-emerald-400">0% (Pure Push)</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs font-mono">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <Waves className="w-4 h-4 text-bifrost-amber" />
                      FFmpeg Speech Correlation
                    </span>
                    <span className="text-bifrost-amber font-bold">
                      Confidence 99.4%
                    </span>
                  </div>

                  {/* Waveform graphic */}
                  <div className="h-28 rounded-2xl bg-zinc-950 border border-white/5 p-4 flex items-center justify-between gap-1 overflow-hidden relative">
                    {Array.from({ length: 32 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-full bg-gradient-to-t from-bifrost-amber/40 to-amber-400 rounded-full transition-all duration-300"
                        style={{
                          height: `${25 + Math.sin(i * 0.8) * 45 + ((i % 4) * 8)}%`
                        }}
                      />
                    ))}
                    <div className="absolute inset-x-0 bottom-2 text-center">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900/90 text-amber-200 border border-bifrost-amber/30">
                        Drift Detected: +0.00s (Auto-Corrected)
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400">Cross-Correlation Pass</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Synced in 1.2s
                    </span>
                  </div>
                </motion.div>
              )}

              {activeStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs font-mono">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-emerald-400" />
                      SSE Server: http://192.168.x.x:42125
                    </span>
                    <span className="text-emerald-400 font-bold">Local LAN</span>
                  </div>

                  {/* Mobile Remote Mini-Card */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">Dune: Part Two (2024)</div>
                        <div className="text-[10px] text-zinc-400">Living Room TV • mpv</div>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-bifrost-amber text-zinc-950 flex items-center justify-center font-bold">
                        <Play className="w-4 h-4 fill-zinc-950" />
                      </div>
                    </div>

                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="w-2/3 h-full bg-bifrost-amber" />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-bifrost-amber" /> 75%
                      </span>
                      <span className="text-emerald-400">PWA Active</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Network Security</span>
                    <span className="text-zinc-200 font-bold">0 Cloud Exposure</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
