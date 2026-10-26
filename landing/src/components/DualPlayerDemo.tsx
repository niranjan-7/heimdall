import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tv, Sparkles, Cpu, Layers, Activity, Check, Gauge } from 'lucide-react'

export const DualPlayerDemo: React.FC = () => {
  const [activeEngine, setActiveEngine] = useState<'mpv' | 'vlc'>('mpv')
  const [anime4kEnabled, setAnime4kEnabled] = useState<boolean>(true)

  return (
    <section id="dual-engine" className="py-24 relative overflow-hidden bg-zinc-950/40">
      {/* Background glow */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[350px] bg-bifrost-cyan/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card border-bifrost-cyan/30 text-bifrost-cyan text-xs font-semibold">
            <Tv className="w-3.5 h-3.5 text-bifrost-cyan" />
            <span>Module 3 • Dual Media Player Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            mpv or VLC. <span className="bg-gradient-to-r from-bifrost-cyan to-blue-400 bg-clip-text text-transparent">Your Setup, Your Choice</span>.
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Heimdall doesn't lock you into a single player. Whether you want the ultra-low latency shader pipeline of <strong>mpv</strong> or the rock-solid universal codec compatibility of <strong>VLC</strong>, Heimdall binds to both effortlessly.
          </p>

          {/* Engine Selector Segmented Control */}
          <div className="flex items-center justify-center pt-4">
            <div className="p-1.5 rounded-2xl glass-panel border border-white/10 flex items-center gap-1 shadow-xl">
              <button
                onClick={() => setActiveEngine('mpv')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                  activeEngine === 'mpv'
                    ? 'bg-bifrost-cyan text-zinc-950 shadow-lg shadow-bifrost-cyan/20 scale-105'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>mpv Player (Modern & Shaders)</span>
              </button>

              <button
                onClick={() => setActiveEngine('vlc')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                  activeEngine === 'vlc'
                    ? 'bg-bifrost-amber text-zinc-950 shadow-lg shadow-bifrost-amber/20 scale-105'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Tv className="w-4 h-4" />
                <span>VLC Media Player (Classic & Robust)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Engine Showcase Card */}
        <div className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-2xl">
          <AnimatePresence mode="wait">
            {activeEngine === 'mpv' ? (
              <motion.div
                key="mpv"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
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

                {/* Right Interactive mpv Pipeline Preview */}
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
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                            anime4kEnabled
                              ? 'bg-bifrost-cyan text-zinc-950 shadow-md shadow-bifrost-cyan/30'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {anime4kEnabled ? 'ACTIVE (4K)' : 'DISABLED'}
                        </button>
                      </div>

                      {/* Simulated Screen rendering */}
                      <div className="relative h-40 rounded-lg overflow-hidden border border-white/10 bg-zinc-900 flex items-center justify-center">
                        <div
                          className={`w-full h-full bg-cover bg-center transition-all duration-300 ${
                            anime4kEnabled ? 'contrast-110 saturate-110 brightness-105' : 'blur-[0.6px]'
                          }`}
                          style={{
                            backgroundImage: `url('https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80')`
                          }}
                        />
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
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
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
                        <Sparkles className="w-4 h-4 text-bifrost-amber" />
                        <span>Background Polling</span>
                      </div>
                      <p className="text-zinc-400 text-xs">
                        Graceful retry connection loop auto-attaches to VLC when opened and goes to sleep when closed.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1.5">
                      <div className="flex items-center gap-2 text-white font-semibold text-sm">
                        <Gauge className="w-4 h-4 text-bifrost-amber" />
                        <span>Lightweight & Rock Solid</span>
                      </div>
                      <p className="text-zinc-400 text-xs">
                        Ultra-low CPU overhead. Heimdall’s watcher consumes &lt; 0.1% CPU in the background while VLC plays.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-1.5">
                      <div className="flex items-center gap-2 text-white font-semibold text-sm">
                        <Layers className="w-4 h-4 text-bifrost-amber" />
                        <span>Subtitle Track Switching</span>
                      </div>
                      <p className="text-zinc-400 text-xs">
                        Switch audio languages or subtitle streams directly from Heimdall or your phone remote without touching the mouse.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Interactive VLC Status Preview */}
                <div className="lg:col-span-5">
                  <div className="glass-card rounded-2xl border border-bifrost-amber/20 p-5 space-y-4 bg-zinc-950/80 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs">
                      <span className="font-mono text-zinc-400">Endpoint: http://127.0.0.1:8080</span>
                      <span className="text-amber-400 font-mono flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        HTTP Polling (500ms)
                      </span>
                    </div>

                    {/* VLC Status Mockup */}
                    <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/5 space-y-3 font-mono text-xs">
                      <div className="text-zinc-400 pb-2 border-b border-white/5 flex items-center justify-between">
                        <span>VLC State Telemetry</span>
                        <span className="text-emerald-400">STATE: PLAYING</span>
                      </div>
                      <div className="space-y-1 text-zinc-300">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">File:</span>
                          <span className="text-zinc-200 truncate max-w-[200px]">Interstellar.2014.1080p.mkv</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Position:</span>
                          <span className="text-bifrost-amber font-bold">01:42:15 / 02:49:03 (60.5%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Audio Stream:</span>
                          <span className="text-zinc-200">Track 1 [English 5.1 DTS-HD]</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Subtitles:</span>
                          <span className="text-zinc-200">Track 2 [English SDH]</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Sub Delay:</span>
                          <span className="text-emerald-400">0.000s (Auto-Synced)</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-500">Compatibility</span>
                      <span className="text-bifrost-amber font-bold">100% Codec Coverage</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
