import React, { useState, useEffect } from 'react'
import { Eye, Download, Menu, X, Sparkles } from 'lucide-react'
import { GithubIcon } from './Icons'

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-4 inset-x-0 max-w-6xl mx-auto z-50 px-4 transition-all duration-300`}
    >
      <div
        className={`flex items-center justify-between px-5 py-3 rounded-2xl transition-all duration-300 ${
          scrolled
            ? 'glass-panel shadow-2xl shadow-black/80'
            : 'bg-zinc-950/40 backdrop-blur-md border border-white/5'
        }`}
      >
        {/* Brand */}
        <a href="#" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-bifrost-amber to-amber-600 flex items-center justify-center shadow-lg shadow-bifrost-amber/20 group-hover:scale-105 transition-transform">
            <Eye className="w-4 h-4 text-zinc-950 font-bold stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black tracking-wider uppercase text-zinc-100">
              Heimdall
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-bifrost-amber/15 text-bifrost-amber border border-bifrost-amber/30">
              v1.2.0
            </span>
          </div>
        </a>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-400">
          <a href="#features" className="hover:text-zinc-100 transition-colors">
            Features
          </a>
          <a href="#auto-sync" className="hover:text-zinc-100 transition-colors flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-bifrost-amber" />
            Audio Auto-Sync
          </a>
          <a href="#dual-engine" className="hover:text-zinc-100 transition-colors">
            Dual Engine
          </a>
          <a href="#mobile-remote" className="hover:text-zinc-100 transition-colors">
            Couch Remote
          </a>
          <a
            href="https://github.com/niranjan-7/heimdall"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-100 transition-colors flex items-center gap-1.5"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            GitHub
          </a>
        </div>

        {/* CTA Button */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://github.com/niranjan-7/heimdall/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-bifrost-amber to-amber-600 hover:from-amber-400 hover:to-bifrost-amber text-zinc-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-bifrost-amber/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            Download Free
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 text-zinc-400 hover:text-zinc-200"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 p-4 rounded-2xl glass-panel space-y-3 animate-in fade-in slide-in-from-top-2">
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-xs font-medium text-zinc-300"
          >
            Features
          </a>
          <a
            href="#auto-sync"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-xs font-medium text-zinc-300"
          >
            Audio Auto-Sync
          </a>
          <a
            href="#dual-engine"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-xs font-medium text-zinc-300"
          >
            Dual Engine (VLC + mpv)
          </a>
          <a
            href="#mobile-remote"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-xs font-medium text-zinc-300"
          >
            Couch Remote PWA
          </a>
          <a
            href="https://github.com/niranjan-7/heimdall/releases/latest"
            className="w-full py-2.5 rounded-xl bg-bifrost-amber text-zinc-950 font-bold text-xs flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            Download for Free
          </a>
        </div>
      )}
    </nav>
  )
}
