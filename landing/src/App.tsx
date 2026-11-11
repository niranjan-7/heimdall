import React from 'react'
import { Navbar } from './components/Navbar'
import { HeroSection } from './components/HeroSection'
import { Features } from './components/Features'
import { Players } from './components/Players'
import { Privacy } from './components/Privacy'
import { OpenSource } from './components/OpenSource'
import { Roadmap } from './components/Roadmap'
import { Footer } from './components/Footer'

export const App: React.FC = () => (
  <div className="min-h-screen bg-obsidian-950 font-sans text-zinc-100 antialiased selection:bg-bifrost-amber selection:text-zinc-950">
    <Navbar />
    <main>
      <HeroSection />
      <Features />
      <Players />
      <Privacy />
      <OpenSource />
      <Roadmap />
    </main>
    <Footer />
  </div>
)

export default App
