import React from 'react'
import { Reveal } from './Reveal'

interface SectionProps {
  id: string
  eyebrow: string
  title: string
  lead?: string
  children: React.ReactNode
}

export const Section: React.FC<SectionProps> = ({ id, eyebrow, title, lead, children }) => (
  <section id={id} className="scroll-mt-20 border-t border-white/[0.06] py-24 sm:py-28">
    <div className="mx-auto max-w-5xl px-6">
      <Reveal>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-bifrost-amber">
          {eyebrow}
        </p>
        <h2 className="mt-4 max-w-2xl text-balance text-3xl font-medium tracking-tight text-zinc-50 sm:text-4xl">
          {title}
        </h2>
        {lead && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-zinc-400">{lead}</p>}
      </Reveal>
      <div className="mt-14">{children}</div>
    </div>
  </section>
)
