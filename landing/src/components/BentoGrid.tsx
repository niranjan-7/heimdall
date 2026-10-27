import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Film, Download, ShieldCheck, Gamepad2, Sparkles, Check, Database, Lock } from 'lucide-react'
import { MotionReveal } from './MotionReveal'
import { TiltCard } from './TiltCard'

export const BentoGrid: React.FC = () => {
  const shouldReduceMotion = useReducedMotion()

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
    hidden: { y: 40, opacity: 0, scale: 0.96 },
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
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-amber-500/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header with Masked Upward Slide-In */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <MotionReveal>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-card border-amber-500/30 text-amber-300 text-xs font-semibold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Built For Cinephiles & Power Users</span>
            </div>
          </MotionReveal>

          <MotionReveal delay={0.1}>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Engineered with <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">Zero Compromises</span>.
            </h2>
          </MotionReveal>

          <MotionReveal delay={0.2}>
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
              Every feature in Heimdall was built to elevate local playback without cloud friction, tracking cookies, or subscription paywalls.
            </p>
          </MotionReveal>
        </div>

        {/* 4-Tile Bento Grid with Staggered 3D Spring Cascade & 3D Tilt Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Tile 1: Dedicated Movies & TV Library (2 Columns Wide) */}
          <TiltCard
            variants={shouldReduceMotion ? undefined : cardVariants}
            accentColor="rgba(245, 158, 11, 0.22)"
            className="md:col-span-2 hover:border-amber-500/40"
          >
            <div className="space-y-4 z-10">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-md">
                <Film className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-white group-hover:text-amber-300 transition-colors">
                  Dedicated Movies & TV Series Library
                </h3>
                <p className="text-zinc-300 text-sm leading-relaxed max-w-xl">
                  Automatic TMDB metadata enrichment with high-res backdrops, release years, cast, and genres. Seamlessly groups multi-part films (<code className="text-amber-300 font-mono text-xs bg-zinc-900 border border-white/10 px-2 py-0.5 rounded">CD1 / CD2</code>) and handles offline tech-spec extraction with zero missing data.
                </p>
              </div>
            </div>

            {/* Visual preview strip inside Tile 1 with rich movie cards */}
            <div className="mt-6 pt-6 border-t border-white/[0.08] grid grid-cols-3 gap-4">
              <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-zinc-900 border border-white/[0.08] group/card shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80"
                  alt="Blade Runner 2049"
                  className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-3">
                  <span className="text-xs font-bold text-white truncate">Blade Runner 2049</span>
                  <span className="text-[10px] text-amber-300 font-mono font-semibold">4K HDR • 8.0 ★</span>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-zinc-900 border border-white/[0.08] group/card shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=600&q=80"
                  alt="Interstellar"
                  className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-3">
                  <span className="text-xs font-bold text-white truncate">Interstellar</span>
                  <span className="text-[10px] text-amber-300 font-mono font-semibold">IMAX • 8.7 ★</span>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-zinc-900 border border-white/[0.08] group/card shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80"
                  alt="Dune Part Two"
                  className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-3">
                  <span className="text-xs font-bold text-white truncate">Dune: Part Two</span>
                  <span className="text-[10px] text-amber-300 font-mono font-semibold">Dolby Atmos • 8.5 ★</span>
                </div>
              </div>
            </div>
          </TiltCard>

          {/* Tile 2: Smart 64KB Hash Subtitle Downloader */}
          <TiltCard
            variants={shouldReduceMotion ? undefined : cardVariants}
            accentColor="rgba(6, 182, 212, 0.22)"
            className="hover:border-teal-400/40"
          >
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center shadow-md">
                <Download className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-white group-hover:text-teal-300 transition-colors">
                  64KB Hash Subtitle Fetcher
                </h3>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  Computes 64KB head & tail checksums to match exact release cuts on OpenSubtitles with multi-name fallback resolution (<code className="text-teal-300 font-mono text-xs bg-zinc-900 border border-white/10 px-1.5 py-0.5 rounded">sub-eng/</code>).
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-black/80 border border-white/[0.08] space-y-2 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between text-zinc-400">
                <span>File Checksum:</span>
                <span className="text-teal-400 font-bold">8e245d969d2d02d0</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Verification:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> 100% Exact Match
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 truncate pt-1 border-t border-white/5">
                Saved: ./Subs/Oppenheimer.srt
              </div>
            </div>
          </TiltCard>

          {/* Tile 3: Discord Rich Presence & AniList Scrobbler */}
          <TiltCard
            variants={shouldReduceMotion ? undefined : cardVariants}
            accentColor="rgba(168, 85, 247, 0.22)"
            className="hover:border-purple-500/40"
          >
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-md">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-white group-hover:text-purple-300 transition-colors">
                  Discord RPC & AniList
                </h3>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  Broadcasts your current watch state to Discord Rich Presence with movie posters and live elapsed timers. Automatically updates episode progress on AniList upon completion.
                </p>
              </div>
            </div>

            {/* Discord Status Mockup Card */}
            <div className="mt-6 p-4 rounded-2xl bg-[#1e1f22] border border-white/[0.08] flex items-center gap-3.5 shadow-md">
              <div className="relative w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=200&q=80"
                  alt="Anime Cover"
                  className="w-full h-full object-cover"
                />
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#1e1f22] absolute bottom-0 right-0 shadow-sm" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-xs font-bold text-white truncate">Playing on Heimdall</div>
                <div className="text-[11px] text-zinc-300 truncate">Frieren: Beyond Journey's End</div>
                <div className="text-[10px] text-zinc-400 font-mono">Ep 14 • 18:42 left</div>
              </div>
            </div>
          </TiltCard>

          {/* Tile 4: 100% Offline & Zero Telemetry (2 Columns Wide) */}
          <TiltCard
            variants={shouldReduceMotion ? undefined : cardVariants}
            accentColor="rgba(16, 185, 129, 0.2)"
            className="md:col-span-2 hover:border-emerald-500/40"
          >
            <div className="space-y-4 z-10">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                  100% Private, Local SQLite & Zero Tracking
                </h3>
                <p className="text-zinc-300 text-sm leading-relaxed max-w-xl">
                  Your watch history belongs to you alone. Heimdall stores all data in a local SQLite file (<code className="text-emerald-300 font-mono text-xs bg-zinc-900 border border-white/10 px-2 py-0.5 rounded">heimdall.db</code>). No cloud servers, no account registration, no telemetry, and zero ads.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-black/80 border border-white/[0.08] space-y-1 shadow-inner">
                <span className="text-zinc-400 font-mono text-[10px] flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-emerald-400" /> STORAGE
                </span>
                <p className="text-white font-bold text-sm">Local SQLite Database</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/80 border border-white/[0.08] space-y-1 shadow-inner">
                <span className="text-zinc-400 font-mono text-[10px] flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-emerald-400" /> TELEMETRY
                </span>
                <p className="text-emerald-400 font-bold text-sm">0 Analytics Requests</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/80 border border-white/[0.08] space-y-1 shadow-inner">
                <span className="text-zinc-400 font-mono text-[10px] flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> LICENSE
                </span>
                <p className="text-white font-bold text-sm">MIT Open Source</p>
              </div>
            </div>
          </TiltCard>
        </motion.div>
      </div>
    </section>
  )
}
