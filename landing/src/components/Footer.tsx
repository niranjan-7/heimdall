import React from 'react'
import { Download, Eye } from 'lucide-react'
import { Reveal } from './Reveal'
import { REPO_URL, RELEASES_URL } from '../lib/site'

const LINKS = [
  { label: 'GitHub', href: REPO_URL },
  { label: 'Releases', href: `${REPO_URL}/releases` },
  { label: 'Changelog', href: `${REPO_URL}/blob/main/CHANGELOG.md` },
  { label: 'Roadmap', href: `${REPO_URL}/blob/main/ROADMAP.md` },
  { label: 'License', href: `${REPO_URL}/blob/main/LICENSE` }
]

export const Footer: React.FC = () => (
  <footer className="border-t border-white/[0.06]">
    <div className="mx-auto max-w-5xl px-6 py-24 text-center">
      <Reveal>
        <h2 className="text-balance text-3xl font-medium tracking-tight text-zinc-50 sm:text-4xl">
          Keep an eye on your library.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15px] text-zinc-400">
          Free for Windows, macOS and Linux. No subscription, no ads, no account.
        </p>
        <a
          href={RELEASES_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-zinc-50 px-5 py-2.5 text-[14px] font-medium text-zinc-950 transition-colors hover:bg-white"
        >
          <Download className="h-4 w-4" />
          Get the latest release
        </a>
      </Reveal>
    </div>

    <div className="border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Eye className="h-4 w-4 text-bifrost-amber/80" strokeWidth={1.75} aria-hidden="true" />
          <span className="text-[12px] text-zinc-500">Heimdall · MIT License</span>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] text-zinc-500 transition-colors hover:text-zinc-200"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
      <p className="mx-auto max-w-5xl px-6 pb-8 text-[11px] leading-relaxed text-zinc-600">
        Heimdall is an independent project and is not affiliated with VLC, mpv, AniList, TMDB,
        OpenSubtitles, AnimeFillerList or Discord.
      </p>
    </div>
  </footer>
)
