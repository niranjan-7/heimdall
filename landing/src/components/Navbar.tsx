import React, { useState, useEffect } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import { Eye, Download, Menu, X, Sparkles } from 'lucide-react'
import { GithubIcon } from './Icons'

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* Topmost Viewport Laser Hairline Progress Tracker */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-50 pointer-events-none bg-white/[0.04]">
        <motion.div
          style={{ scaleX, transformOrigin: '0%' }}
          className="h-full bg-gradient-to-r from-amber-500 via-teal-400 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.9)]"
        />
      </div>

      {/* Floating Aerospace-Style Command Bar */}
      <header className="fixed top-3 sm:top-4 inset-x-0 max-w-6xl mx-auto z-40 px-3 sm:px-4 transition-all duration-300">
        <div
          className={`relative flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-2.5 rounded-2xl transition-all duration-300 overflow-hidden ${
            scrolled
              ? 'glass-pill shadow-[0_16px_40px_rgba(0,0,0,0.85)] border-white/[0.12] bg-[#090b12]/85'
              : 'bg-[#090b12]/50 backdrop-blur-xl border border-white/[0.07] shadow-xl'
          }`}
        >
          {/* Integrated laser progress bar along the bottom seam of the navbar */}
          <motion.div
            style={{ scaleX, transformOrigin: '0%' }}
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-teal-400 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)] z-20 pointer-events-none"
          />

          {/* Left Segment: Brand & Live IPC Telemetry Chip */}
          <div className="flex items-center gap-3">
            <a href="#" className="flex items-center gap-2.5 group">
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform duration-200">
                <Eye className="w-4 h-4 text-zinc-950 font-bold stroke-[2.5]" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-teal-400 ring-2 ring-zinc-950 animate-pulse" />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black tracking-[0.16em] uppercase text-zinc-100 group-hover:text-amber-300 transition-colors">
                    HEIMDALL
                  </span>
                  <span className="hidden sm:inline-block text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    v1.2.0
                  </span>
                </div>
                <span className="text-[9px] font-mono text-zinc-400 hidden sm:flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                  IPC Named Pipe • Active
                </span>
              </div>
            </a>
          </div>

          {/* Center Segment: Tactile Navigation Deck */}
          <nav className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-zinc-900/60 border border-white/[0.05]">
            <a
              href="#story-showcase"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.07] transition-all flex items-center gap-1.5"
            >
              <span className="w-1 h-1 rounded-full bg-zinc-500" />
              Workflow
            </a>
            <a
              href="#auto-sync"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300/90 hover:text-amber-200 hover:bg-amber-500/10 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '9s' }} />
              Audio Auto-Sync
            </a>
            <a
              href="#dual-engine"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.07] transition-all flex items-center gap-1.5"
            >
              <span className="w-1 h-1 rounded-full bg-zinc-500" />
              Dual Engine
            </a>
            <a
              href="#mobile-remote"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.07] transition-all flex items-center gap-1.5"
            >
              <span className="w-1 h-1 rounded-full bg-zinc-500" />
              Couch Remote
            </a>
            <a
              href="#features"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.07] transition-all flex items-center gap-1.5"
            >
              <span className="w-1 h-1 rounded-full bg-zinc-500" />
              Specs
            </a>
          </nav>

          {/* Right Segment: GitHub Pill + High-Sheen CTA Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="https://github.com/niranjan-7/heimdall"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-mono transition-all hover:scale-102"
              title="GitHub Repository"
            >
              <GithubIcon className="w-3.5 h-3.5 text-zinc-200" />
              <span>GitHub</span>
              <span className="text-[10px] px-1 rounded bg-zinc-800 text-amber-400 font-bold border border-white/5">
                ★ Star
              </span>
            </a>

            {/* High-Sheen Metallic CTA Button */}
            <a
              href="https://github.com/niranjan-7/heimdall/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="relative group px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-zinc-950 font-extrabold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] transition-all hover:scale-105 active:scale-95"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Download Free</span>
            </a>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-xl bg-zinc-900/80 text-zinc-400 hover:text-white border border-white/10"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown with Frosted Studio Styling */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-2 p-4 rounded-2xl glass-pill border border-white/10 space-y-2.5 animate-in fade-in slide-in-from-top-2 shadow-2xl">
            <a
              href="#story-showcase"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 px-3 rounded-xl text-xs font-medium text-zinc-200 hover:bg-white/[0.06] hover:text-white"
            >
              <span>Workflow</span>
              <span className="text-[10px] font-mono text-zinc-500">01-03</span>
            </a>
            <a
              href="#auto-sync"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 px-3 rounded-xl text-xs font-medium text-amber-300 hover:bg-amber-500/10"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Audio Auto-Sync
              </span>
              <span className="text-[10px] font-mono text-amber-400/80">FFmpeg</span>
            </a>
            <a
              href="#dual-engine"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 px-3 rounded-xl text-xs font-medium text-zinc-200 hover:bg-white/[0.06]"
            >
              <span>Dual Engine (mpv + VLC)</span>
              <span className="text-[10px] font-mono text-teal-400">Shaders</span>
            </a>
            <a
              href="#mobile-remote"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 px-3 rounded-xl text-xs font-medium text-zinc-200 hover:bg-white/[0.06]"
            >
              <span>Couch Remote</span>
              <span className="text-[10px] font-mono text-emerald-400">LAN PWA</span>
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-2 px-3 rounded-xl text-xs font-medium text-zinc-200 hover:bg-white/[0.06]"
            >
              <span>Specifications</span>
              <span className="text-[10px] font-mono text-zinc-500">Local DB</span>
            </a>
            <div className="pt-2 border-t border-white/5 flex gap-2">
              <a
                href="https://github.com/niranjan-7/heimdall"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 text-xs font-mono text-center rounded-xl bg-zinc-900 text-zinc-300 border border-white/10"
              >
                GitHub
              </a>
              <a
                href="https://github.com/niranjan-7/heimdall/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 text-xs font-bold text-center rounded-xl bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20"
              >
                Download
              </a>
            </div>
          </div>
        )}
      </header>
    </>
  )
}
