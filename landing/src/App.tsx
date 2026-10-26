import React, { useEffect } from 'react'
import { Navbar } from './components/Navbar'
import { HeroSection } from './components/HeroSection'
import { AutoSyncDemo } from './components/AutoSyncDemo'
import { DualPlayerDemo } from './components/DualPlayerDemo'
import { MobileRemoteDemo } from './components/MobileRemoteDemo'
import { BentoGrid } from './components/BentoGrid'
import { Footer } from './components/Footer'

export const App: React.FC = () => {
  useEffect(() => {
    // Smooth scrolling for anchor links
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => {
      document.documentElement.style.scrollBehavior = 'auto'
    }
  }, [])

  return (
    <div className="min-h-screen bg-obsidian-950 text-zinc-100 selection:bg-bifrost-amber selection:text-zinc-950 font-sans antialiased relative selection:font-bold">
      {/* Top Floating Glass Pill Navbar */}
      <Navbar />

      <main className="relative z-10 flex flex-col space-y-12">
        {/* Hero Section with 3D Tilt App Frame */}
        <HeroSection />

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
