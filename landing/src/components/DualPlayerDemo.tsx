import React, { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Tv, Sparkles, Cpu, Layers, Activity, Check, Gauge } from 'lucide-react'
import { MotionReveal } from './MotionReveal'

export const DualPlayerDemo: React.FC = () => {
  const [activeEngine, setActiveEngine] = useState<'mpv' | 'vlc'>('mpv')
  const [anime4kEnabled, setAnime4kEnabled] = useState<boolean>(true)
  const shouldReduceMotion = useReducedMotion()

  return (
    <section id="dual-engine" className="py-24 relative overflow-hidden bg-zinc-950/40">
      {/* Background glow */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[350px] bg-bifrost-cyan/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header with Masked Upward Slide-In */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <MotionReveal>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card border-bifrost-cyan/30 text-bifrost-cyan text-xs font-semibold">
              <Tv className="w-3.5 h-3.5 text-bifrost-cyan" />
              <span>Module 3 • Dual Media Player Architecture</span>
            </div>
          </MotionReveal>

          <MotionReveal delay={0.1}>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              mpv or VLC. <span className="bg-gradient-to-r from-bifrost-cyan to-blue-400 bg-clip-text text-transparent">Your Setup, Your Choice</span>.
            </h2>
          </MotionReveal>

          <MotionReveal delay={0.2}>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Heimdall doesn't lock you into a single player. Whether you want the ultra-low latency shader pipeline of <strong>mpv</strong> or the rock-solid universal codec compatibility of <strong>VLC</strong>, Heimdall binds to both effortlessly.
            </p>
          </MotionReveal>

          {/* Engine Selector Segmented Control with layoutId Gliding Highlight */}
          <MotionReveal delay={0.3}>
            <div className="flex items-center justify-center pt-4">
              <div className="p-1.5 rounded-2xl glass-panel border border-white/10 flex items-center gap-1 shadow-xl relative">
                {/* mpv button */}
                <button
                  onClick={() => setActiveEngine('mpv')}
                  className={`relative px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer z-10 ${
                    activeEngine === 'mpv' ? 'text-zinc-950 font-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {activeEngine === 'mpv' && (
                    <motion.div
                      layoutId="engineActiveTab"
                      className="absolute inset-0 bg-bifrost-cyan rounded-xl shadow-lg shadow-bifrost-cyan/30 -z-10"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Cpu className="w-4 h-4" />
                  <span>mpv Player (Modern Enthusiast)</span>
                </button>

                {/* VLC button */}
                <button
                  onClick={() => setActiveEngine('vlc')}
                  className={`relative px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer z-10 ${
                    activeEngine === 'vlc' ? 'text-zinc-950 font-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {activeEngine === 'vlc' && (
                    <motion.div
                      layoutId="engineActiveTab"
                      className="absolute inset-0 bg-bifrost-amber rounded-xl shadow-lg shadow-bifrost-amber/30 -z-10"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Tv className="w-4 h-4" />
                  <span>VLC Media Player (Classic & Robust)</span>
                </button>
              </div>
            </div>
          </MotionReveal>
        </div>

        {/* Engine Showcase Card with Spring Entrance & AnimatePresence Morph */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { y: 35, opacity: 0, scale: 0.98 }}
          whileInView={{ y: 0, opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-2xl transform-gpu"
        >
          <AnimatePresence mode="wait">
            {activeEngine === 'mpv' ? (
              <motion.div
                key="mpv"
                initial={{ opacity: 0, x: 20, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.98 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                {/* Left Specs */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-md bg-bifrost-cyan/15 border border-bifrost-cyan/30 text-bifrost-cyan text-xs font-mono font-bold">
                        ENGINE: MPV
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                        <Activity className="w-3.5 h-3.5 animate-pulse" />
                        0ms Named Pipe IPC Active
                      </span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                      Raw GPU Power with Real-Time GLSL Shaders
                    </h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Connected directly via native Windows Named Pipes (<code className="text-zinc-300 font-mono text-xs bg-zinc-800 px-1.5 py-0.5 rounded">\\.\pipe\heimdall-mpv</code>). Every seek, pause, and chapter jump dispatches instant bi-directional push events with zero polling overhead.
                    </p>
                  </div>

                  {/* Features List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1.5">
                      <div className="flex items-center gap-2 text-white font-semibold text-sm">
                        <Sparkles className="w-4 h-4 text-bifrost-cyan" />
                        <span>Anime4K Upscaling</span>
                      </div>
                      <p className="text-zinc-400 text-xs">
                        Real-time neural network reconstruction filters to upscale 1080p anime into razor-sharp 4K without edge ringing.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1.5">
                      <div className="flex items-center gap-2 text-white font-semibold text-sm">
                        <Gauge className="w-4 h-4 text-bifrost-cyan" />
                        <span>0ms Event Push</span>
                      </div>
                      <p className="text-zinc-400 text-xs">
                        True JSON-IPC event stream. Scrobblers trigger instantly the exact millisecond credits roll.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1.5">
                      <div className="flex items-center gap-2 text-white font-semibold text-sm">
                        <Layers className="w-4 h-4 text-bifrost-cyan" />
                        <span>GPU-HQ Scaling</span>
                      </div>
                      <p className="text-zinc-400 text-xs">
                        High-quality EWA Lanczos Sharp video interpolation, anti-ring dither, and native HDR tone-mapping.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1.5">
                      <div className="flex items-center gap-2 text-white font-semibold text-sm">
                        <Check className="w-4 h-4 text-bifrost-cyan" />
                        <span>In-Player OSD Text</span>
                      </div>
                      <p className="text-zinc-400 text-xs">
                        Displays live Heimdall subtitle sync notices and AniList scrobble confirmations straight on the player canvas.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Interactive mpv Pipeline Preview with Anime4K split divider sweep */}
                <div className="lg:col-span-5">
                  <div className="glass-card rounded-2xl border border-bifrost-cyan/20 p-5 space-y-4 bg-zinc-950/80 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs">
                      <span className="font-mono text-zinc-400">IPC: \\.\pipe\heimdall-mpv</span>
                      <span className="text-emerald-400 font-mono flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        Connected
                      </span>
                    </div>

                    {/* Anime4K Toggle Simulator */}
                    <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-bifrost-cyan" />
                            Anime4K Shader Chain
                          </div>
                          <div className="text-xs text-zinc-400">Restore_CNN_M + Upscale_x2_M</div>
                        </div>
                        <button
                          onClick={() => setAnime4kEnabled(!anime4kEnabled)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            anime4kEnabled
                              ? 'bg-bifrost-cyan text-zinc-950 shadow-md shadow-bifrost-cyan/30'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {anime4kEnabled ? 'ACTIVE (4K)' : 'DISABLED'}
                        </button>
                      </div>

                      {/* Screen rendering with split divider sweep */}
                      <div className="relative h-44 rounded-lg overflow-hidden border border-white/10 bg-zinc-900 flex items-center justify-center">
                        <div
                          className={`w-full h-full bg-cover bg-center transition-all duration-300 ${
                            anime4kEnabled ? 'contrast-110 saturate-110 brightness-105' : 'blur-[0.6px]'
                          }`}
                          style={{
                            backgroundImage: `url('https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80')`
                          }}
                        />

                        {/* Animated Anime4K Shader Suite Split Comparison Divider */}
                        {anime4kEnabled && (
                          <motion.div
                            initial={shouldReduceMotion ? { left: '50%' } : { left: '15%' }}
                            animate={{ left: '50%' }}
                            transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                            className="absolute top-0 bottom-0 w-0.5 bg-bifrost-cyan shadow-[0_0_12px_rgba(6,182,212,0.9)] z-20 pointer-events-none"
                          >
                            <div className="absolute top-1/2 -translate-y-1/2 -left-3.5 w-7 h-7 rounded-full bg-bifrost-cyan text-zinc-950 font-mono text-[9px] font-bold flex items-center justify-center shadow-md">
                              4K
                            </div>
                          </motion.div>
                        )}

                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-white border border-white/10">
                          {anime4kEnabled ? 'GLSL SHADER: Anime4K v4.0.1 (High)' : 'Source: 1080p Native'}
                        </div>
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-bifrost-cyan/90 text-zinc-950 font-mono text-[10px] font-bold">
                          {anime4kEnabled ? 'Sharpness +140%' : 'Bilinear'}
                        </div>
                      </div>
                    </div>

                    {/* Live Telemetry Ping */}
                    <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-500">Telemetry Push Latency</span>
                      <span className="text-bifrost-cyan font-bold">&lt; 0.4 ms</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="vlc"
                initial={{ opacity: 0, x: 20, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.98 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                {/* Left Specs */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-md bg-bifrost-amber/15 border border-bifrost-amber/30 text-bifrost-amber text-xs font-mono font-bold">
                        ENGINE: VLC MEDIA PLAYER
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                        <Activity className="w-3.5 h-3.5" />
                        HTTP Web API Active
                      </span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                      The Universal Media Workhorse You Already Love
                    </h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      Zero configuration required. Heimdall auto-detects running VLC instances via its local HTTP web interface (<code className="text-zinc-300 font-mono text-xs bg-zinc-800 px-1.5 py-0.5 rounded">http://localhost:8080</code>) and tracks your watch history effortlessly.
                    </p>
                  </div>

                  {/* Features List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1.5">
                      <div className="flex items-center gap-2 text-white font-semibold text-sm">
                        <Check className="w-4 h-4 text-bifrost-amber" />
                        <span>Plays Everything</span>
                      </div>
                      <p className="text-zinc-400 text-xs">
                        Handles any format, codec, or legacy container without downloading codecs: MKV, MP4, AVI, WMV, VOB, TS.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1.5">
                      <div className="flex items-center gap-2 text-white font-semibold text-sm">
                        <Check className="w-4 h-4 text-bifrost-amber" />
                        <span>Auto-Detect Web API</span>
                      </div>
                      <p className="text-zinc-400 text-xs">
                        Discovers local VLC port 8080 automatically. No complicated config file editing needed.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1.5">
                      <div className="flex items-center gap-2 text-white font-semibold text-sm">
                        <Check className="w-4 h-4 text-bifrost-amber" />
                        <span>Seamless Scrobbling</span>
                      </div>
                      <p className="text-zinc-400 text-xs">
                        Polls playback state via lightweight HTTP GET requests and pushes watch status to Discord and AniList.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1.5">
                      <div className="flex items-center gap-2 text-white font-semibold text-sm">
                        <Check className="w-4 h-4 text-bifrost-amber" />
                        <span>Hardware Decoding</span>
                      </div>
                      <p className="text-zinc-400 text-xs">
                        Leverages VLC’s DXVA2 / D3D11 hardware acceleration to play heavy 4K HDR files on any PC.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Interactive VLC Pipeline Preview */}
                <div className="lg:col-span-5">
                  <div className="glass-card rounded-2xl border border-bifrost-amber/20 p-5 space-y-4 bg-zinc-950/80 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs">
                      <span className="font-mono text-zinc-400">Endpoint: http://127.0.0.1:8080</span>
                      <span className="text-amber-400 font-mono flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        VLC Active
                      </span>
                    </div>

                    {/* VLC Status Box */}
                    <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/5 space-y-3 font-mono text-xs">
                      <div className="text-zinc-400">VLC Media Player 3.0.20 Vetinari</div>
                      <div className="p-3 rounded-lg bg-zinc-950 border border-white/5 text-zinc-300 space-y-1 text-[11px]">
                        <div>GET /requests/status.xml</div>
                        <div className="text-emerald-400">&lt;state&gt;playing&lt;/state&gt;</div>
                        <div className="text-bifrost-amber">&lt;time&gt;5420&lt;/time&gt; &lt;length&gt;8640&lt;/length&gt;</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-500">Compatibility Score</span>
                      <span className="text-bifrost-amber font-bold">100% (Universal)</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}
