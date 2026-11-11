import React from 'react'
import { Section } from './Section'
import { Reveal } from './Reveal'

const FEATURES = [
  {
    tag: '01',
    title: 'Shows and movies, remembered',
    body: 'Point Heimdall at your folders. It tracks progress per episode, resumes where you stopped, groups multi-part films, and pulls posters and details from TMDB and AniList.'
  },
  {
    tag: '02',
    title: 'Subtitle auto-sync',
    body: 'Matches subtitle timing to the speech in the audio using FFmpeg. It applies a fix only when it is confident, saves the result as a separate file, and can be undone.'
  },
  {
    tag: '03',
    title: 'Anime4K in mpv',
    body: 'Ships the real Anime4K v4 shaders. Pick Mode A, B or C, with a lighter set for laptops and older graphics cards.'
  },
  {
    tag: '04',
    title: 'AniList and filler guides',
    body: 'Two-way AniList progress sync. Filler episodes from AnimeFillerList are marked and can be dimmed, so canon stands out.'
  },
  {
    tag: '05',
    title: 'Subtitle downloader',
    body: 'Finds subtitles on your disk first, then matches your exact release by file hash on OpenSubtitles, and sends them through auto-sync.'
  },
  {
    tag: '06',
    title: 'Phone remote',
    body: 'Off by default. Scan a QR code and control playback from your phone’s browser over your own Wi-Fi. Nothing to install on the phone.'
  }
]

export const Features: React.FC = () => (
  <Section
    id="features"
    eyebrow="What it does"
    title="One quiet app that handles the fiddly parts."
    lead="Heimdall does not replace your player. It looks after everything around it."
  >
    <div className="grid gap-px overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((f, i) => (
        <Reveal key={f.tag} delay={(i % 3) * 0.05} className="bg-obsidian-950">
          <div className="h-full p-7 transition-colors hover:bg-white/[0.02]">
            <span className="font-mono text-[11px] text-bifrost-amber/80">{f.tag}</span>
            <h3 className="mt-5 text-[16px] font-medium text-zinc-100">{f.title}</h3>
            <p className="mt-2.5 text-[14px] leading-relaxed text-zinc-400">{f.body}</p>
          </div>
        </Reveal>
      ))}
    </div>
    <p className="mt-6 text-[13px] text-zinc-500">
      Also: Discord Rich Presence, optional video thumbnails taken from your own files, and
      Liquid Glass, Classic Dark and OLED themes.
    </p>
  </Section>
)
