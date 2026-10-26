import React, { useEffect } from 'react'
import Lenis from 'lenis'
import { Navbar } from './components/Navbar'
import { HeroSection } from './components/HeroSection'
import { StickyScrollShowcase } from './components/StickyScrollShowcase'
import { AutoSyncDemo } from './components/AutoSyncDemo'
import { DualPlayerDemo } from './components/DualPlayerDemo'
import { MobileRemoteDemo } from './components/MobileRemoteDemo'
import { BentoGrid } from './components/BentoGrid'
import { Footer } from './components/Footer'

export const App: React.FC = () => {
  // Initialize Lenis Inertial Smooth Scrolling
  useEffect(() => {
    // Respect prefers-reduced-motion for accessibility
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      wheelMultiplier: 0.95
    })

    let animationFrameId: number

    function raf(time: number) {
      lenis.raf(time)
      animationFrameId = requestAnimationFrame(raf)
    }

    animationFrameId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(animationFrameId)
      lenis.destroy()
    }
  }, [])

  return (
    <div className="min-h-screen bg-obsidian-950 text-zinc-100 selection:bg-bifrost-amber selection:text-zinc-950 font-sans antialiased relative selection:font-bold">
      {/* Top Floating Glass Pill Navbar */}
      <Navbar />

      <main className="relative z-10 flex flex-col space-y-12">
        {/* Hero Section with Parallax Mockup & Scroll Exit Scaling */}
        <HeroSection />

        {/* Sticky Scroll-Linked 3-Pillar Story Showcase (Pinned Viewport) */}
        <StickyScrollShowcase />

        {/* Module 1 Showcase: Audio-to-Subtitle Auto-Sync Waveform Visualizer */}
        <AutoSyncDemo />

        {/* Module 3 Showcase: Dual Engine Switcher (mpv Shaders vs VLC Codecs) */}
        <DualPlayerDemo />

        {/* Module 5 Showcase: Mobile Web Companion Couch Remote Phone Mockup */}
        <MobileRemoteDemo />

        {/* Modules 2, 4, 6 & Architectural Bento Grid */}
        <BentoGrid />
      </main>

      {/* Footer & Global CTA */}
      <Footer />
    </div>
  )
}

export default App
