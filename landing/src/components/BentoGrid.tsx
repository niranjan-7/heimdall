import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Film,
  Sparkles,
  Check,
  Database,
  Lock,
  RefreshCw,
  FolderSync,
  Trash2,
  HardDrive,
  BookOpen,
  Palette,
  Archive
} from 'lucide-react'
import { MotionReveal } from './MotionReveal'
import { TiltCard } from './TiltCard'

export const BentoGrid: React.FC = () => {
  const shouldReduceMotion = useReducedMotion()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
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

        {/* 6-Tile Bento Grid with Staggered 3D Spring Cascade & 3D Tilt Cards */}
        <motion.div
          id="filler-features"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Tile 1: Anime Filler Detection & Episode Badges (2 Columns Wide) */}
          <TiltCard
            variants={shouldReduceMotion ? undefined : cardVariants}
            accentColor="rgba(244, 63, 94, 0.25)"
            className="md:col-span-2 hover:border-rose-500/40"
          >
            <div className="space-y-4 z-10">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-md">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    New in v1.4
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">AnimeFillerList API</span>
                </div>
                <h3 className="text-2xl font-bold text-white group-hover:text-rose-300 transition-colors">
                  Anime Filler Detection & Smart Episode Badges
                </h3>
                <p className="text-zinc-300 text-sm leading-relaxed max-w-xl">
                  Automated synchronization with AnimeFillerList. High-contrast indicators tag every episode card: <span className="text-rose-400 font-semibold">🛑 Filler</span>, <span className="text-amber-400 font-semibold">⚡ Mixed Canon</span>, <span className="text-sky-400 font-semibold">📘 Anime Canon</span>, and <span className="text-emerald-400 font-semibold">🟢 Manga Canon</span>. Toggle the <strong>1-Click &quot;Canon Only&quot; Filter</strong> to binge pure manga storylines without distraction.
                </p>
              </div>
            </div>

            {/* Visual Episode Badges Preview Strip */}
            <div className="mt-6 pt-6 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-1.5 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-200 text-xs">EP 125–150</span>
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                </div>
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/30 text-rose-200 border border-rose-500/40">
                  🛑 Filler
                </span>
                <p className="text-[10px] text-zinc-400 leading-snug">Safe to skip arc</p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-1.5 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-200 text-xs">EP 151</span>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                </div>
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-500/40">
                  ⚡ Mixed Canon
                </span>
                <p className="text-[10px] text-zinc-400 leading-snug">Manga + filler scenes</p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-1.5 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-200 text-xs">EP 152–175</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-500/40">
                  🟢 Manga Canon
                </span>
                <p className="text-[10px] text-zinc-400 leading-snug">100% official manga story</p>
              </div>

              <div className="p-3 rounded-2xl bg-sky-950/40 border border-sky-500/40 space-y-1.5 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-200 text-xs">Canon Filter</span>
                  <Check className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/30 text-sky-200 border border-sky-500/40">
                  1-Click Filter
                </span>
                <p className="text-[10px] text-zinc-400 leading-snug">Auto-hide all non-canon</p>
              </div>
            </div>
          </TiltCard>

          {/* Tile 2: Smart Disk Space Management & 1-Click Cleaners (1 Column) */}
          <TiltCard
            variants={shouldReduceMotion ? undefined : cardVariants}
            accentColor="rgba(245, 158, 11, 0.25)"
            className="hover:border-amber-500/40"
          >
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-md">
                <HardDrive className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Space Guard
                </span>
                <h3 className="text-2xl font-bold text-white group-hover:text-amber-300 transition-colors">
                  1-Click Space Cleaners
                </h3>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  Purge 60+ filler episodes or watched files straight to the Windows Recycle Bin to free up 30+ GB.
                </p>
              </div>
            </div>

            <div className="mt-6 p-3.5 rounded-2xl bg-black/80 border border-white/[0.08] space-y-2.5 shadow-inner text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Clean Fillers
                </span>
                <span className="font-mono text-rose-400 font-bold">~28.4 GB Free</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/5 pt-2">
                <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                  <Archive className="w-3.5 h-3.5 text-amber-400" /> Watch History
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">100% Preserved</span>
              </div>
            </div>
          </TiltCard>

          {/* Tile 3: Multi-Theme UI System (1 Column) */}
          <TiltCard
            variants={shouldReduceMotion ? undefined : cardVariants}
            accentColor="rgba(56, 189, 248, 0.25)"
            className="hover:border-sky-400/40"
          >
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shadow-md">
                <Palette className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-white group-hover:text-sky-300 transition-colors">
                  Multi-Theme Visual Engine
                </h3>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  Switch instantly between <strong>🌊 Liquid Glass</strong> (VisionOS acrylic desktop blur), <strong>🌙 Classic Dark</strong> (Obsidian), or <strong>🖤 OLED Black</strong> with true #000000 contrast.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
              <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300">
                Liquid Glass
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300">
                Classic Dark
              </div>
              <div className="p-2.5 rounded-xl bg-black border border-amber-500/40 text-amber-400">
                OLED Black
              </div>
            </div>
          </TiltCard>

          {/* Tile 4: AniList Global Progress & Scrobbling (1 Column) */}
          <TiltCard
            variants={shouldReduceMotion ? undefined : cardVariants}
            accentColor="rgba(168, 85, 247, 0.25)"
            className="hover:border-purple-500/40"
          >
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-white group-hover:text-purple-300 transition-colors">
                  AniList Global Progress
                </h3>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  Track total story progress (<code className="text-purple-300 font-mono text-xs bg-zinc-900 border border-white/10 px-1 py-0.5 rounded">Ep 158 of 175</code>) alongside local files on disk. Real-time scrobbling and official titles everywhere.
                </p>
              </div>
            </div>

            <div className="mt-6 p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-xs space-y-1">
              <div className="flex items-center justify-between text-purple-300 font-semibold">
                <span>Story Progress</span>
                <span className="font-mono font-bold">158 / 175 (90%)</span>
              </div>
              <p className="text-[10px] text-zinc-400">70 episodes on local drive</p>
            </div>
          </TiltCard>

          {/* Tile 5: Dedicated Movies & TV Library with TMDB (1 Column) */}
          <TiltCard
            variants={shouldReduceMotion ? undefined : cardVariants}
            accentColor="rgba(245, 158, 11, 0.22)"
            className="hover:border-amber-500/40"
          >
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-md">
                <Film className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-white group-hover:text-amber-300 transition-colors">
                  Movies & TV with TMDB
                </h3>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  Automatic TMDB metadata enrichment with high-res backdrops, release years, cast, and genres. Merges multi-part films (<code className="text-amber-300 font-mono text-xs bg-zinc-900 border border-white/10 px-1 py-0.5 rounded">CD1/CD2</code>) effortlessly.
                </p>
              </div>
            </div>

            <div className="mt-6 p-3.5 rounded-2xl bg-black/80 border border-white/[0.08] flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-bold truncate">Oppenheimer (2023)</span>
              <span className="text-amber-400 font-mono text-[10px] font-bold">4K IMAX • 8.9 ★</span>
            </div>
          </TiltCard>

          {/* Tile 6: Zero-Loss Updates & Automated Safety Snapshots (2 Columns Wide) */}
          <TiltCard
            variants={shouldReduceMotion ? undefined : cardVariants}
            accentColor="rgba(16, 185, 129, 0.2)"
            className="md:col-span-2 hover:border-emerald-500/40"
          >
            <div className="space-y-4 z-10">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-md">
                <FolderSync className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Zero-Loss In-App Updates & Automated Safety Backups
                </h3>
                <p className="text-zinc-300 text-sm leading-relaxed max-w-xl">
                  Update Heimdall seamlessly from inside the app with zero fear of data loss. Every update creates an automated pre-flight snapshot backup of your entire library (<code className="text-emerald-300 font-mono text-xs bg-zinc-900 border border-white/10 px-2 py-0.5 rounded">library_pre_update.json</code>), preserving 100% of your watch history, paths, and credentials.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-black/80 border border-white/[0.08] space-y-1 shadow-inner">
                <span className="text-zinc-400 font-mono text-[10px] flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-emerald-400" /> BACKUP
                </span>
                <p className="text-white font-bold text-sm">Automated Pre-Flight Snapshot</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/80 border border-white/[0.08] space-y-1 shadow-inner">
                <span className="text-zinc-400 font-mono text-[10px] flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 text-emerald-400" /> UPDATES
                </span>
                <p className="text-emerald-400 font-bold text-sm">1-Click In-App Upgrade</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/80 border border-white/[0.08] space-y-1 shadow-inner">
                <span className="text-zinc-400 font-mono text-[10px] flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-emerald-400" /> PRIVACY
                </span>
                <p className="text-white font-bold text-sm">100% Offline & Local</p>
              </div>
            </div>
          </TiltCard>
        </motion.div>
      </div>
    </section>
  )
}
