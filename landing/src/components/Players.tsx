import React from 'react'
import { Section } from './Section'
import { Reveal } from './Reveal'

const PLAYERS = [
  {
    name: 'mpv',
    note: 'The enthusiast pick',
    points: [
      'Instant progress: mpv pushes playback events over its IPC pipe.',
      'Anime4K upscaling and high-quality scaling profiles.',
      'Subtitle offsets are applied live while the video plays.'
    ]
  },
  {
    name: 'VLC',
    note: 'The one that plays everything',
    points: [
      'Controlled through VLC’s local web interface, protected by a random password.',
      'Plays almost any format: .mkv, .avi, .wmv, .vob, .ts.',
      'Progress is read about once a second.'
    ]
  }
]

export const Players: React.FC = () => (
  <Section
    id="players"
    eyebrow="Your player, your choice"
    title="Works with VLC and mpv, which you install separately."
    lead="Heimdall talks to the player you already like. Your video files are never changed or re-encoded."
  >
    <div className="grid gap-6 md:grid-cols-2">
      {PLAYERS.map((p, i) => (
        <Reveal key={p.name} delay={i * 0.08}>
          <div className="h-full rounded-lg border border-white/[0.06] p-7">
            <div className="flex items-baseline justify-between">
              <h3 className="font-mono text-lg text-zinc-100">{p.name}</h3>
              <span className="text-[12px] text-zinc-500">{p.note}</span>
            </div>
            <ul className="mt-6 space-y-3">
              {p.points.map((pt) => (
                <li key={pt} className="flex gap-3 text-[14px] leading-relaxed text-zinc-400">
                  <span className="mt-[9px] h-px w-3 shrink-0 bg-bifrost-amber/70" />
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      ))}
    </div>
  </Section>
)
