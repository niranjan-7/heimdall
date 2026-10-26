import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Smartphone, Wifi, Play, Pause, Volume2, FastForward, Rewind, MessageSquare, Sparkles } from 'lucide-react'

export const MobileRemoteDemo: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [progress, setProgress] = useState<number>(42)
  const [volume, setVolume] = useState<number>(75)
  const [subOffset, setSubOffset] = useState<number>(0)

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
    <section id="mobile-remote" className="py-24 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[600px] h-[400px] bg-bifrost-amber/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card border-bifrost-amber/30 text-bifrost-amber text-xs font-semibold">
            <Smartphone className="w-3.5 h-3.5 text-bifrost-amber" />
            <span>Module 5 • PWA Couch Remote</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Control Your TV or PC <br />
            <span className="bg-gradient-to-r from-bifrost-amber via-amber-300 to-amber-500 bg-clip-text text-transparent">
              Right from the Couch.
            </span>
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            No keyboard reach. No App Store download. Heimdall spins up a lightning-fast local web server. Just point your phone’s camera at the QR code and control playback, volume, and subtitle offsets instantly.
          </p>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: 3D-styled Phone Mockup */}
          <div className="lg:col-span-6 flex justify-center">
            <motion.div
              initial={{ rotateY: -10, rotateX: 5 }}
              whileHover={{ rotateY: 0, rotateX: 0 }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              className="relative w-[310px] sm:w-[340px] rounded-[48px] p-3.5 bg-gradient-to-b from-zinc-700 via-zinc-900 to-zinc-950 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(245,158,11,0.15)] border-2 border-zinc-700/60"
            >
              {/* Dynamic Island / Notch */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-30 flex items-center justify-end px-3">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-700" />
              </div>

              {/* Phone Screen Glass */}
              <div className="relative w-full rounded-[38px] bg-zinc-950 overflow-hidden border border-white/10 p-5 pt-8 text-white select-none">
                {/* Phone Status Bar */}
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono mb-4 px-1">
                  <span>9:41</span>
                  <div className="flex items-center gap-1.5">
                    <Wifi className="w-3 h-3 text-bifrost-amber" />
                    <span>5G</span>
                    <div className="w-4 h-2 rounded-sm border border-zinc-400 p-0.5 flex items-center">
                      <div className="w-full h-full bg-emerald-400 rounded-2xs" />
                    </div>
                  </div>
                </div>

                {/* Remote App Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-bifrost-amber/20 border border-bifrost-amber/40 flex items-center justify-center">
                      <span className="text-[10px] font-black text-bifrost-amber">H</span>
                    </div>
                    <span className="text-xs font-bold tracking-wider text-zinc-200">COUCH REMOTE</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                </div>

                {/* Now Playing Poster Card */}
                <div className="my-5 relative rounded-2xl overflow-hidden aspect-[16/10] bg-zinc-900 border border-white/10 group shadow-lg">
                  <img
                    src="https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80"
                    alt="Now Playing"
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 space-y-0.5">
                    <span className="px-2 py-0.5 rounded bg-bifrost-amber/90 text-zinc-950 text-[9px] font-extrabold tracking-wide">
                      MPV ENGINE
                    </span>
                    <h5 className="text-sm font-extrabold text-white truncate">Dune: Part Two (2024)</h5>
                    <p className="text-[10px] text-zinc-300">2160p HDR • Dolby Atmos • 02:46:12</p>
                  </div>
                </div>

                {/* Progress Scrubber */}
                <div className="space-y-1 mb-5">
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden relative cursor-pointer">
                    <div
                      className="h-full bg-gradient-to-r from-bifrost-amber to-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>01:10:24</span>
                    <span>02:46:12</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-between px-2 mb-6">
                  <button
                    onClick={() => setProgress((p) => Math.max(0, p - 5))}
                    className="p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/5 active:scale-95 transition-all"
                  >
                    <Rewind className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-14 h-14 rounded-2xl bg-gradient-to-r from-bifrost-amber to-amber-600 text-zinc-950 flex items-center justify-center shadow-lg shadow-bifrost-amber/30 active:scale-90 transition-all"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                  </button>

                  <button
                    onClick={() => setProgress((p) => Math.min(100, p + 5))}
                    className="p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/5 active:scale-95 transition-all"
                  >
                    <FastForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Subtitle Nudge Strip on Phone */}
                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-white/5 space-y-2 mb-4">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <MessageSquare className="w-3 h-3 text-bifrost-amber" />
                      Subtitle Offset
                    </span>
                    <span className="font-mono text-bifrost-amber font-bold">
                      {subOffset >= 0 ? `+${subOffset}` : subOffset}ms
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() => nudgeSub(-250)}
                      className="py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono font-medium active:scale-95 transition-transform"
                    >
                      -250ms
                    </button>
                    <button
                      onClick={() => nudgeSub(-50)}
                      className="py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono font-medium active:scale-95 transition-transform"
                    >
                      -50ms
                    </button>
                    <button
                      onClick={() => nudgeSub(50)}
                      className="py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono font-medium active:scale-95 transition-transform"
                    >
                      +50ms
                    </button>
                    <button
                      onClick={() => nudgeSub(250)}
                      className="py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono font-medium active:scale-95 transition-transform"
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
                    className="w-full accent-bifrost-amber h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 min-w-[28px] text-right">
                    {volume}%
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: Feature Highlights & QR Scanner Card */}
          <div className="lg:col-span-6 space-y-8">
            <div className="space-y-4">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Zero Configuration. Just Scan & Lean Back.
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Heimdall hosts a local, lightweight HTTP server on port <code className="text-zinc-200 font-mono text-xs bg-zinc-800 px-1.5 py-0.5 rounded">42125</code> directly from your PC. No third-party servers, no relay tunnels, and no data leaves your home Wi-Fi.
              </p>
            </div>

            {/* QR Connection Card */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col sm:flex-row items-center gap-6 shadow-xl">
              <div className="p-3 rounded-2xl bg-white text-zinc-950 shadow-md flex-shrink-0">
                {/* SVG QR Code Illustration */}
                <div className="w-28 h-28 flex flex-col justify-between p-1 bg-white">
                  <div className="flex justify-between">
                    <div className="w-7 h-7 border-4 border-black rounded-sm flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-black rounded-2xs" />
                    </div>
                    <div className="w-7 h-7 border-4 border-black rounded-sm flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-black rounded-2xs" />
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-2 h-2 bg-black" />
                    <div className="w-3 h-1 bg-black" />
                    <div className="w-1.5 h-3 bg-black" />
                    <div className="w-2.5 h-2.5 bg-bifrost-amber rounded-xs" />
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="w-7 h-7 border-4 border-black rounded-sm flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-black rounded-2xs" />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div className="w-2 h-2 bg-black" />
                      <div className="w-2 h-2 bg-black" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <span className="px-2.5 py-0.5 rounded-full bg-bifrost-amber/20 text-bifrost-amber text-[11px] font-bold">
                  LOCAL WI-FI ONLY
                </span>
                <h4 className="text-white font-bold text-base">Point Phone Camera Here</h4>
                <p className="text-zinc-400 text-xs">
                  Connects via Server-Sent Events (SSE). Seamlessly updates seek position and volume in real-time with 0% cloud dependence.
                </p>
                <div className="pt-1 text-[11px] font-mono text-zinc-500">
                  http://192.168.x.x:42125
                </div>
              </div>
            </div>

            {/* List of 3 Key Advantages */}
            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-bifrost-amber/15 border border-bifrost-amber/30 text-bifrost-amber flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-white font-bold text-sm">Instant Progressive Web App (PWA)</h5>
                  <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">
                    Add it to your home screen with one tap for a true fullscreen native app experience on iOS and Android.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-bifrost-cyan/15 border border-bifrost-cyan/30 text-bifrost-cyan flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-white font-bold text-sm">Zero Network Latency</h5>
                  <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">
                    Commands execute locally over your LAN router in under 5 milliseconds. No spinning wheels.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
