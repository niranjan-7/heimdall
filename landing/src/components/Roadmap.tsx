import React from 'react'
import { Section } from './Section'
import { Reveal } from './Reveal'
import { REPO_URL } from '../lib/site'

const STEPS = [
  {
    state: 'Shipped',
    title: 'v1.5',
    body: 'Real Anime4K shaders, a rebuilt subtitle auto-sync that checks its own work, stealth playback, universal macOS app, and CI-built releases with checksums.',
    active: true
  },
  {
    state: 'Next',
    title: 'v1.x',
    body: 'Better filler matching with a fix-match window, and many more file names read correctly. Already merged, waiting for the next release.',
    active: false
  },
  {
    state: 'Planned',
    title: 'v2.0',
    body: 'A modern local anime tracker: a new foundation, new features and a new look. Plans can change; the roadmap says what is real and what is not.',
    active: false
  }
]

export const Roadmap: React.FC = () => (
  <Section
    id="roadmap"
    eyebrow="Roadmap"
    title="Features ship before they are marketed."
    lead="This page only describes what the app does today. Planned work is labelled as planned."
  >
    <ol className="grid gap-6 md:grid-cols-3">
      {STEPS.map((s, i) => (
        <Reveal key={s.title} delay={i * 0.07}>
          <li className="h-full list-none border-t border-white/10 pt-5">
            <div className="flex items-center gap-2.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${s.active ? 'bg-bifrost-amber' : 'bg-white/20'}`}
              />
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                {s.state}
              </span>
            </div>
            <h3 className="mt-4 text-lg font-medium text-zinc-100">{s.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-zinc-400">{s.body}</p>
          </li>
        </Reveal>
      ))}
    </ol>
    <p className="mt-10 text-[13px] text-zinc-500">
      Full detail in the{' '}
      <a
        href={`${REPO_URL}/blob/main/ROADMAP.md`}
        target="_blank"
        rel="noreferrer"
        className="text-zinc-300 underline decoration-white/20 underline-offset-4 hover:decoration-white/50"
      >
        roadmap
      </a>
      .
    </p>
  </Section>
)
