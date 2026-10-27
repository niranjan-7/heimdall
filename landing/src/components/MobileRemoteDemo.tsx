import React, { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { Smartphone, Wifi, Play, Pause, Volume2, FastForward, Rewind, MessageSquare, Sparkles } from 'lucide-react'
import { MotionReveal } from './MotionReveal'

export const MobileRemoteDemo: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [progress, setProgress] = useState<number>(42)
  const [volume, setVolume] = useState<number>(75)
  const [subOffset, setSubOffset] = useState<number>(0)
  const sectionRef = useRef<HTMLElement>(null)
  const shouldReduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start']
  })

  // Opposing Scroll Parallax: Left phone floats upward faster, Right rises steadily
  const rawPhoneY = useTransform(scrollYProgress, [0, 1], [50, -30])
  const rawPhoneRotateZ = useTransform(scrollYProgress, [0, 1], [-2, 0])
  const rawRightY = useTransform(scrollYProgress, [0, 1], [30, 0])

  const phoneY = shouldReduceMotion ? 0 : rawPhoneY
  const phoneRotateZ = shouldReduceMotion ? 0 : rawPhoneRotateZ
  const rightY = shouldReduceMotion ? 0 : rawRightY

  // Subtle playhead increment
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 0.5))
    }, 1000)
    return () => clearInterval(interval)
  }, [isPlaying])

  const nudgeSub = (amount: number) => {
    setSubOffset((prev) => prev + amount)
  }

  return (
    <section ref={sectionRef} id="mobile-remote" className="py-24 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[600px] h-[400px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header with Masked Upward Slide-In */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <MotionReveal>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-card border-amber-500/30 text-amber-300 text-xs font-semibold shadow-sm">
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span>Module 5 • PWA Couch Remote</span>
            </div>
          </MotionReveal>

          <MotionReveal delay={0.1}>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Control Your TV or PC <br />
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                Right from the Couch.
              </span>
            </h2>
          </MotionReveal>

          <MotionReveal delay={0.2}>
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
              No keyboard reach. No App Store download. Heimdall spins up a lightning-fast local web server. Just point your phone’s camera at the QR code and control playback, volume, and subtitle offsets instantly.
            </p>
          </MotionReveal>
        </div>

        {/* Content Layout with Opposing Parallax */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: 3D-styled Titanium Phone Mockup with Parallax Lift */}
          <motion.div
            style={{ y: phoneY, rotateZ: phoneRotateZ }}
            className="lg:col-span-6 flex justify-center transform-gpu"
          >
            <motion.div
              initial={{ rotateY: -10, rotateX: 5 }}
              whileHover={{ rotateY: 0, rotateX: 0 }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              className="relative w-[310px] sm:w-[340px] rounded-[50px] p-3.5 bg-gradient-to-b from-zinc-600 via-zinc-800 to-zinc-950 shadow-[0_30px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(245,158,11,0.18)] border-2 border-zinc-600/70 cursor-pointer ring-1 ring-white/20"
            >
              {/* Dynamic Island / Notch */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-30 flex items-center justify-end px-3">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-700" />
              </div>

              {/* Phone Screen Glass */}
              <div className="relative w-full rounded-[38px] bg-zinc-950 overflow-hidden border border-white/[0.08] p-5 pt-8 text-white select-none shadow-inner">
                {/* Phone Status Bar */}
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono mb-4 px-1">
                  <span>9:41</span>
                  <div className="flex items-center gap-1.5">
                    <Wifi className="w-3 h-3 text-amber-400" />
                    <span>5G</span>
                    <div className="w-4 h-2 rounded-sm border border-zinc-400 p-0.5 flex items-center">
                      <div className="w-full h-full bg-emerald-400 rounded-2xs" />
                    </div>
                  </div>
                </div>

                {/* Remote App Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-400 to-amber-500 flex items-center justify-center font-bold text-zinc-950 text-xs shadow-sm">
                      H
                    </div>
                    <span className="text-xs font-bold font-mono tracking-wider text-zinc-200">HEIMDALL REMOTE</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    0ms SSE
                  </span>
                </div>

                {/* Now Playing Banner */}
                <div className="my-5 p-3.5 rounded-2xl bg-zinc-900/90 border border-white/[0.08] space-y-2 shadow-md">
                  <div className="text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                    <span>NOW PLAYING • mpv</span>
                    <span className="text-teal-400 font-bold">4K HDR</span>
                  </div>
                  <div className="text-sm font-bold text-white truncate">Dune: Part Two (2024)</div>
                  <div className="text-xs text-zinc-400 truncate font-mono">Chapter 14 — Worm Ride</div>
                </div>

                {/* Playback Scrubber */}
                <div className="space-y-1.5 my-4">
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative cursor-pointer">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full relative"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>01:14:28</span>
                    <span>02:46:12</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-6 my-6">
                  <button
                    onClick={() => setProgress((prev) => Math.max(0, prev - 5))}
                    className="p-2.5 rounded-full bg-zinc-900 text-zinc-300 hover:text-white active:scale-90 transition-transform cursor-pointer border border-white/5"
                  >
                    <Rewind className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 to-amber-500 text-zinc-950 flex items-center justify-center shadow-lg shadow-amber-500/30 active:scale-95 transition-transform cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 fill-zinc-950" />
                    ) : (
                      <Play className="w-6 h-6 fill-zinc-950 ml-1" />
                    )}
                  </button>

                  <button
                    onClick={() => setProgress((prev) => Math.min(100, prev + 5))}
                    className="p-2.5 rounded-full bg-zinc-900 text-zinc-300 hover:text-white active:scale-90 transition-transform cursor-pointer border border-white/5"
                  >
                    <FastForward className="w-5 h-5" />
                  </button>
                </div>

                {/* Subtitle Sync Micro-Controls */}
                <div className="p-3 rounded-2xl bg-zinc-900/70 border border-white/[0.08] space-y-2 mb-4">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <MessageSquare className="w-3 h-3 text-amber-400" />
                      Subtitle Offset
                    </span>
                    <span className="font-mono text-amber-300 font-bold">
                      {subOffset >= 0 ? `+${subOffset}` : subOffset}ms
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() => nudgeSub(-250)}
                      className="py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono font-medium active:scale-95 transition-transform cursor-pointer"
                    >
                      -250ms
                    </button>
                    <button
                      onClick={() => nudgeSub(-50)}
                      className="py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono font-medium active:scale-95 transition-transform cursor-pointer"
                    >
                      -50ms
                    </button>
                    <button
                      onClick={() => nudgeSub(50)}
                      className="py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono font-medium active:scale-95 transition-transform cursor-pointer"
                    >
                      +50ms
                    </button>
                    <button
                      onClick={() => nudgeSub(250)}
                      className="py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono font-medium active:scale-95 transition-transform cursor-pointer"
                    >
                      +250ms
                    </button>
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center gap-3 px-1">
                  <Volume2 className="w-4 h-4 text-zinc-400" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 min-w-[28px] text-right font-bold">
                    {volume}%
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Feature Highlights & QR Scanner Card with Steady Parallax & Laser Sweep */}
          <motion.div
            style={{ y: rightY }}
            initial={shouldReduceMotion ? { opacity: 0 } : { y: 35, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.1 }}
            className="lg:col-span-6 space-y-8 transform-gpu"
          >
            <div className="space-y-4">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Zero Configuration. Just Scan & Lean Back.
              </h3>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Heimdall hosts a local, lightweight HTTP server on port <code className="text-amber-300 font-mono text-xs bg-zinc-900 border border-white/10 px-2 py-0.5 rounded">42125</code> directly from your PC. No third-party servers, no relay tunnels, and no data leaves your home Wi-Fi.
              </p>
            </div>

            {/* QR Connection Card with Looping Laser Effect & Cyber Corner Reticle */}
            <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/[0.12] flex flex-col sm:flex-row items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
              {/* QR Container with Laser Scanline and Corner Accents */}
              <div className="relative p-3.5 rounded-2xl bg-white text-zinc-950 shadow-md flex-shrink-0 overflow-hidden ring-4 ring-black/40">
                {/* Looping Vertical Amber Laser Scan-Line */}
                <motion.div
                  animate={
                    shouldReduceMotion
                      ? {}
                      : { top: ['0%', '92%', '0%'] }
                  }
                  transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                  className="absolute left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_10px_rgba(245,158,11,0.95)] z-20 pointer-events-none"
                />

                {/* Corner Targeting Brackets */}
                <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-500 z-20" />
                <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-500 z-20" />
                <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-500 z-20" />
                <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-500 z-20" />

                {/* SVG QR Code Illustration */}
                <div className="w-28 h-28 flex flex-col justify-between p-1 bg-white relative z-10">
                  <div className="flex justify-between">
                    <div className="w-7 h-7 border-4 border-black rounded-sm flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-black rounded-2xs" />
                    </div>
                    <div className="w-7 h-7 border-4 border-black rounded-sm flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-black rounded-2xs" />
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 bg-black rounded-sm flex items-center justify-center text-white text-[9px] font-bold font-mono">
                      H
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <div className="w-7 h-7 border-4 border-black rounded-sm flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-black rounded-2xs" />
                    </div>
                    <div className="w-7 h-7 grid grid-cols-2 gap-1 p-1">
                      <div className="bg-black rounded-2xs" />
                      <div className="bg-black rounded-2xs" />
                      <div className="bg-black rounded-2xs" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-3 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LAN Server: port 42125
                </div>
                <div className="text-white font-bold text-sm">
                  1. Scan with iPhone or Android Camera
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Opens the zero-install progressive web app immediately. No App Store logins, no Bluetooth pairing headaches.
                </p>
                <div className="text-[11px] font-mono text-zinc-400">
                  Fallback URL: <span className="text-amber-300 font-semibold">http://192.168.1.100:42125</span>
                </div>
              </div>
            </div>

            {/* Privacy Guarantee Pill */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.08] flex items-center gap-3 text-xs text-zinc-300">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>100% Zero-Cloud Architecture.</strong> The remote connection only communicates within your local private subnet.
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
