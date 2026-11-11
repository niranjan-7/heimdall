import React, { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { GithubIcon } from './Icons'
import { REPO_URL, RELEASES_URL } from '../lib/site'

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#players', label: 'Players' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#open-source', label: 'Open source' },
  { href: '#roadmap', label: 'Roadmap' }
]

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled
          ? 'border-b border-white/[0.06] bg-obsidian-950/80 backdrop-blur-md'
          : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-2.5 text-zinc-100">
          <Eye className="h-[18px] w-[18px] text-bifrost-amber" strokeWidth={1.75} aria-hidden="true" />
          <span className="text-[13px] font-medium tracking-[0.14em] uppercase">Heimdall</span>
        </a>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] text-zinc-400 transition-colors hover:text-zinc-100"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-zinc-400 transition-colors hover:text-zinc-100"
          >
            <GithubIcon className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-white/10 px-3 py-1.5 text-[13px] text-zinc-100 transition-colors hover:border-white/25 hover:bg-white/[0.04]"
          >
            Download
          </a>
        </div>
      </div>
    </header>
  )
}
