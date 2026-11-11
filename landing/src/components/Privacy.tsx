import React from 'react'
import { Section } from './Section'
import { Reveal } from './Reveal'

const ITEMS = [
  {
    title: 'Local by default',
    body: 'Your library and history live in plain JSON files in the app’s data folder. Nothing is uploaded.'
  },
  {
    title: 'No tracking',
    body: 'No analytics, no telemetry, no account.'
  },
  {
    title: 'Honest about the network',
    body: 'It contacts AniList and TMDB for metadata, OpenSubtitles when you download subtitles, Discord for Rich Presence (optional), and GitHub to check for updates. It sends titles, IDs and a file hash, never your files.'
  },
  {
    title: 'Your Wi-Fi only',
    body: 'The phone remote is off by default, stays on your network, and needs a pairing code.'
  }
]

export const Privacy: React.FC = () => (
  <Section
    id="privacy"
    eyebrow="Privacy"
    title="Your library stays yours."
    lead="Written down plainly, so you can check it against the source."
  >
    <dl className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
      {ITEMS.map((it, i) => (
        <Reveal key={it.title} delay={(i % 2) * 0.06}>
          <dt className="text-[15px] font-medium text-zinc-100">{it.title}</dt>
          <dd className="mt-2 text-[14px] leading-relaxed text-zinc-400">{it.body}</dd>
        </Reveal>
      ))}
    </dl>
  </Section>
)
