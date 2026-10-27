import React, { useRef } from 'react'
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from 'framer-motion'
import { Download, Sparkles, ExternalLink } from 'lucide-react'
import { GithubIcon } from './Icons'

export const Footer: React.FC = () => {
  const shouldReduceMotion = useReducedMotion()
  const ctaRef = useRef<HTMLDivElement>(null)

  // Scroll-linked scale & glow transition as CTA approaches viewport center
  const { scrollYProgress } = useScroll({
    target: ctaRef,
    offset: ['start end', 'center center']
  })

  const rawScale = useTransform(scrollYProgress, [0, 1], [0.94, 1.0])
  const rawGlowOpacity = useTransform(scrollYProgress, [0, 1], [0.2, 1.0])

  const scale = useSpring(rawScale, { stiffness: 100, damping: 25 })
  const glowOpacity = useSpring(rawGlowOpacity, { stiffness: 100, damping: 25 })

  return (
    <footer className="relative border-t border-white/[0.08] pt-20 pb-12 overflow-hidden bg-[#050609]">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-amber-500/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6">
        {/* Bottom CTA Card with Scroll-Linked Scale & Glow Transition */}
        <motion.div
          ref={ctaRef}
          style={{
            scale: shouldReduceMotion ? 1 : scale
          }}
          className="glass-panel p-8 sm:p-14 rounded-3xl border border-white/[0.12] relative overflow-hidden text-center space-y-6 mb-16 shadow-[0_30px_70px_rgba(0,0,0,0.9)] transform-gpu"
        >
          {/* Dynamic background radial amber glow fading from 0.2 to 1 */}
          <motion.div
            style={{
              opacity: shouldReduceMotion ? 0.7 : glowOpacity
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[340px] bg-gradient-to-tr from-amber-500/30 via-amber-400/20 to-teal-500/15 rounded-full blur-[110px] pointer-events-none transform-gpu"
          />

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-pill border-amber-500/30 text-amber-300 text-xs font-semibold relative z-10 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Source Desktop Media Companion</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight relative z-10 leading-tight">
            Take Back Control of Your <br />
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
              Movie & Anime Nights
            </span>
          </h2>

          <p className="text-zinc-300 text-sm sm:text-base max-w-xl mx-auto relative z-10 leading-relaxed">
            Available today for Windows, macOS, and Linux. No subscriptions, no ads, 100% free and open source forever.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 relative z-10">
            <a
              href="https://github.com/niranjan-7/heimdall/releases/download/v1.2.0/Heimdall.Setup.1.2.0.exe"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-zinc-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(245,158,11,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_0_35px_rgba(245,158,11,0.6)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              Download for Windows (.exe)
            </a>

            <a
              href="https://github.com/niranjan-7/heimdall"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl glass-card hover:bg-zinc-800/90 text-zinc-200 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 border border-white/10 hover:border-amber-400/40 transition-all hover:scale-102 cursor-pointer"
            >
              <GithubIcon className="w-4 h-4" />
              View on GitHub
            </a>
          </div>

          <div className="flex items-center justify-center gap-6 pt-2 text-xs text-zinc-400 font-mono relative z-10">
            <span>Windows 10/11</span>
            <span>•</span>
            <span>macOS (Intel / Apple Silicon)</span>
            <span>•</span>
            <span>Linux (.AppImage)</span>
          </div>
        </motion.div>

        {/* Footer Navigation & Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-white/[0.08] text-xs text-zinc-400">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 flex items-center justify-center shadow-md shadow-amber-500/20">
              <span className="font-black text-zinc-950 text-xs">H</span>
            </div>
            <div>
              <span className="font-extrabold text-white text-sm tracking-wider uppercase">HEIMDALL</span>
              <span className="text-zinc-500 ml-2 font-mono text-[11px]">v1.2.0</span>
            </div>
          </div>

          <div className="flex items-center gap-6 font-medium text-xs">
            <a href="#story-showcase" className="hover:text-white transition-colors">
              Workflow
            </a>
            <a href="#auto-sync" className="hover:text-amber-300 transition-colors">
              Auto-Sync
            </a>
            <a href="#dual-engine" className="hover:text-white transition-colors">
              Dual Engine
            </a>
            <a href="#mobile-remote" className="hover:text-white transition-colors">
              Couch Remote
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a
              href="https://github.com/niranjan-7/heimdall/releases"
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-300 transition-colors flex items-center gap-1 font-mono text-amber-400/90"
            >
              Releases <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
