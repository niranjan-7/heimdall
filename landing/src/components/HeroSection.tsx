import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Download, Sparkles, Shield, Zap, ChevronRight, CheckCircle2, Play } from 'lucide-react'
import { InteractiveAppMockup } from './InteractiveAppMockup'

export const HeroSection: React.FC = () => {
  const [detectedOs, setDetectedOs] = useState<'windows' | 'mac' | 'linux'>('windows')

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

  const handleDownloadClick = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#f59e0b', '#06b6d4', '#8b5cf6', '#10b981']
    })
  }

  const osLabels = {
    windows: { name: 'Windows (.exe)', link: 'https://github.com/niranjan-7/heimdall/releases/download/v1.2.0/Heimdall.Setup.1.2.0.exe' },
    mac: { name: 'macOS (.dmg)', link: 'https://github.com/niranjan-7/heimdall/releases/latest' },
    linux: { name: 'Linux (.AppImage)', link: 'https://github.com/niranjan-7/heimdall/releases/latest' }
  }

  return (
    <section className="relative min-h-screen pt-32 pb-20 overflow-hidden flex flex-col items-center justify-center">
      {/* Background Aurora Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-bifrost-amber/20 via-bifrost-cyan/15 to-bifrost-violet/10 rounded-full blur-[120px] pointer-events-none animate-glow" />
      <div className="absolute top-1/3 left-1/3 w-[450px] h-[300px] bg-bifrost-amber/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6 text-center space-y-6">
        {/* Release Tag Pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-card border-bifrost-amber/30 text-bifrost-amber text-xs font-semibold shadow-lg shadow-bifrost-amber/10"
        >
          <Sparkles className="w-3.5 h-3.5 text-bifrost-amber animate-spin" style={{ animationDuration: '8s' }} />
          <span>Heimdall v1.2.0 Released • Multi-Engine + Couch Remote</span>
          <ChevronRight className="w-3 h-3 text-bifrost-amber" />
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.08]"
        >
          The All-Seeing Watchman for <br />
          <span className="bg-gradient-to-r from-bifrost-amber via-amber-300 to-amber-500 bg-clip-text text-transparent">
            VLC & mpv Media Players.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-400 font-normal leading-relaxed"
        >
          Zero manual tracking. Heimdall connects directly to your local players with{' '}
          <span className="text-zinc-200 font-medium">0ms push telemetry</span>,{' '}
          <span className="text-zinc-200 font-medium">AI-powered audio speech subtitle auto-sync</span>,{' '}
          AniList & Discord integration, and an instant couch remote for your smartphone.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <a
            href={osLabels[detectedOs].link}
            onClick={handleDownloadClick}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-bifrost-amber to-amber-600 hover:from-amber-400 hover:to-bifrost-amber text-zinc-950 font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-bifrost-amber/25 hover:shadow-bifrost-amber/40 transition-all hover:scale-105 active:scale-95"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            Download for {osLabels[detectedOs].name}
          </a>

          <a
            href="#auto-sync"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl glass-panel hover:bg-zinc-900/90 text-zinc-200 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:border-white/20"
          >
            <Play className="w-4 h-4 text-bifrost-amber" />
            See Live Demo
          </a>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex items-center justify-center gap-6 pt-2 text-xs text-zinc-500 font-medium flex-wrap"
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Free & Open Source</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-bifrost-amber" />
            <span>Zero Tracking • Fully Local</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>0ms IPC Telemetry</span>
          </div>
        </motion.div>
      </div>

      {/* 3D Tilt Application Mockup Showcase */}
      <div className="w-full max-w-6xl mx-auto px-4 mt-14">
        <InteractiveAppMockup />
      </div>
    </section>
  )
}
