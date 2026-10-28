import React, { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Download, Shield, Zap, ChevronRight, CheckCircle2, Play } from 'lucide-react'
import { InteractiveAppMockup } from './InteractiveAppMockup'

export const HeroSection: React.FC = () => {
  const [detectedOs, setDetectedOs] = useState<'windows' | 'mac' | 'linux'>('windows')
  const containerRef = useRef<HTMLElement>(null)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase()
    if (userAgent.includes('mac')) {
      setDetectedOs('mac')
    } else if (userAgent.includes('linux')) {
      setDetectedOs('linux')
    } else {
      setDetectedOs('windows')
    }
  }, [])

  // Parallax & Scroll Exit via Framer Motion useScroll
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start']
  })

  // Apple-style 3D App Window Unfold on Scroll [0, 0.45]
  const rawRotateX = useTransform(scrollYProgress, [0, 0.45], [18, 0])
  const rawMockupScale = useTransform(scrollYProgress, [0, 0.45], [0.92, 1.0])
  const rawMockupY = useTransform(scrollYProgress, [0, 0.45], [40, 0])
  const rawGlowOpacity = useTransform(scrollYProgress, [0, 0.45], [0.3, 0.85])

  const rotateX = useSpring(rawRotateX, { stiffness: 100, damping: 25 })
  const mockupScale = useSpring(rawMockupScale, { stiffness: 100, damping: 25 })
  const mockupY = useSpring(rawMockupY, { stiffness: 100, damping: 25 })
  const glowOpacity = useSpring(rawGlowOpacity, { stiffness: 100, damping: 25 })

  // Headline scroll exit fade
  const rawHeadlineScale = useTransform(scrollYProgress, [0, 0.6], [1, 0.92])
  const rawHeadlineOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const headlineScale = shouldReduceMotion ? 1 : rawHeadlineScale
  const headlineOpacity = shouldReduceMotion ? 1 : rawHeadlineOpacity

  // Background aurora shift
  const rawAuroraY = useTransform(scrollYProgress, [0, 1], [0, 100])
  const auroraY = shouldReduceMotion ? 0 : rawAuroraY

  const handleDownloadClick = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#f59e0b', '#06b6d4', '#8b5cf6', '#10b981']
    })
  }

  const osLabels = {
    windows: {
      name: 'Windows (.exe)',
      link: 'https://github.com/niranjan-7/heimdall/releases/download/v1.4.0/Heimdall.Setup.1.4.0.exe'
    },
    mac: { name: 'macOS (.dmg)', link: 'https://github.com/niranjan-7/heimdall/releases/latest' },
    linux: { name: 'Linux (.AppImage)', link: 'https://github.com/niranjan-7/heimdall/releases/latest' }
  }

  // Staggered text entrance kinematics with spring and motion blur
  const textContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05
      }
    }
  }

  const textItemVariants = {
    hidden: { y: 24, opacity: 0, filter: 'blur(8px)' },
    visible: {
      y: 0,
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 20
      }
    }
  }

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen pt-36 pb-20 overflow-hidden flex flex-col items-center justify-center"
    >
      {/* Background Aurora Glow with Layered Parallax */}
      <motion.div
        style={{ y: auroraY }}
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[440px] bg-gradient-to-tr from-amber-500/15 via-teal-500/10 to-purple-600/10 rounded-full blur-[140px] pointer-events-none transform-gpu"
      />
      <motion.div
        style={{ y: auroraY }}
        className="absolute top-1/3 left-1/3 w-[450px] h-[300px] bg-amber-500/10 rounded-full blur-[110px] pointer-events-none transform-gpu"
      />

      {/* Hero Content with Staggered Entrance & Scroll Exit */}
      <motion.div
        style={{
          scale: headlineScale,
          opacity: headlineOpacity
        }}
        variants={textContainerVariants}
        initial="hidden"
        animate="visible"
        className="relative max-w-5xl mx-auto px-6 text-center space-y-6 transform-gpu"
      >
        {/* Release Tag Pill: Aerospace HUD Chip */}
        <motion.div
          variants={textItemVariants}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill border-amber-500/30 text-amber-300 text-xs font-semibold shadow-[0_0_20px_rgba(245,158,11,0.15)] group"
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="tracking-wide">Heimdall v1.2.1 • Liquid Glass & Auto-Scrobbler</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 font-mono">
            New
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
        </motion.div>

        {/* Main Headline with High-Contrast Metallic Sheen */}
        <motion.h1
          variants={textItemVariants}
          className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.08]"
        >
          The All-Seeing Watchman for <br />
          <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(245,158,11,0.25)]">
            VLC & mpv Media Players.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={textItemVariants}
          className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-300 font-normal leading-relaxed"
        >
          Zero manual tracking. Heimdall connects directly to your local players with{' '}
          <span className="text-white font-semibold underline decoration-teal-400/50 underline-offset-4">0ms push telemetry</span>,{' '}
          <span className="text-white font-semibold underline decoration-amber-400/50 underline-offset-4">AI audio speech auto-sync</span>,{' '}
          AniList & Discord scrobbling, and an instant couch remote for your phone.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={textItemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <a
            href={osLabels[detectedOs].link}
            onClick={handleDownloadClick}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-zinc-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(245,158,11,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_0_35px_rgba(245,158,11,0.6)] transition-all hover:scale-105 active:scale-95"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            Download for {osLabels[detectedOs].name}
          </a>

          <a
            href="#story-showcase"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl glass-card hover:bg-zinc-800/90 text-zinc-200 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 border border-white/10 hover:border-amber-400/40 transition-all hover:scale-102"
          >
            <Play className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            Explore The Architecture
          </a>
        </motion.div>

        {/* High-Tech HUD Telemetry Chips */}
        <motion.div
          variants={textItemVariants}
          className="flex items-center justify-center gap-3 pt-3 text-xs font-mono text-zinc-400 flex-wrap"
        >
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900/60 border border-white/[0.06] shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Free & Open Source</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900/60 border border-white/[0.06] shadow-sm">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Zero Tracking • Fully Local</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900/60 border border-white/[0.06] shadow-sm">
            <Zap className="w-3.5 h-3.5 text-teal-400" />
            <span>0ms Push IPC Socket</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Apple-Style 3D Perspective App Window Unfold on Scroll */}
      <div
        style={{ perspective: 1200 }}
        className="w-full max-w-6xl mx-auto px-4 mt-12 relative"
      >
        {/* Dynamic ambient glow behind the window, scaling opacity on unfold */}
        <motion.div
          style={{ opacity: shouldReduceMotion ? 0.6 : glowOpacity }}
          className="absolute inset-x-8 -inset-y-4 bg-gradient-to-tr from-amber-500/30 via-teal-500/20 to-purple-600/20 rounded-3xl blur-[90px] pointer-events-none transform-gpu"
        />

        <motion.div
          style={{
            rotateX: shouldReduceMotion ? 0 : rotateX,
            scale: shouldReduceMotion ? 1 : mockupScale,
            y: shouldReduceMotion ? 0 : mockupY,
            transformStyle: 'preserve-3d'
          }}
          className="transform-gpu relative z-10"
        >
          <InteractiveAppMockup />
        </motion.div>
      </div>
    </section>
  )
}
