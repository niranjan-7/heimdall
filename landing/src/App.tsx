import React from 'react'
import { ReactLenis } from 'lenis/react'
import { Navbar } from './components/Navbar'
import { HeroSection } from './components/HeroSection'
import { StickyScrollShowcase } from './components/StickyScrollShowcase'
import { AutoSyncDemo } from './components/AutoSyncDemo'
import { DualPlayerDemo } from './components/DualPlayerDemo'
import { MobileRemoteDemo } from './components/MobileRemoteDemo'
import { BentoGrid } from './components/BentoGrid'
import { Footer } from './components/Footer'

export const App: React.FC = () => {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.08,
        duration: 1.2,
        smoothWheel: true,
        wheelMultiplier: 0.95
      }}
    >
      <div className="min-h-screen bg-obsidian-950 text-zinc-100 selection:bg-bifrost-amber selection:text-zinc-950 font-sans antialiased relative selection:font-bold">
        {/* Top Floating Glass Pill Navbar with Spring Scroll Progress Bar */}
        <Navbar />

        <main className="relative z-10 flex flex-col space-y-12">
          {/* Hero Section with 3D Window Unfold & Staggered Text Entrance */}
          <HeroSection />

          {/* Sticky Scroll-Linked 3-Pillar Story Showcase (Pinned 300vh Scrubbing) */}
          <StickyScrollShowcase />

          {/* Module 1 Showcase: Audio-to-Subtitle Auto-Sync Waveform Visualizer */}
          <AutoSyncDemo />

          {/* Module 3 Showcase: Dual Engine Switcher (mpv Shaders vs VLC Codecs) */}
          <DualPlayerDemo />

          {/* Module 5 Showcase: Mobile Web Companion Couch Remote Phone Mockup */}
          <MobileRemoteDemo />

          {/* Modules 2, 4, 6 & Architectural Bento Grid with 3D TiltCards */}
          <BentoGrid />
        </main>

        {/* Footer & Global CTA */}
        <Footer />
      </div>
    </ReactLenis>
  )
}

export default App
