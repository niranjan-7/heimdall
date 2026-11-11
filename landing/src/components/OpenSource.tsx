import React from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Section } from './Section'
import { Reveal } from './Reveal'
import { GithubIcon } from './Icons'
import { REPO_URL } from '../lib/site'

const FACTS = [
  { k: 'License', v: 'MIT' },
  { k: 'Built with', v: 'Electron, React, TypeScript' },
  { k: 'Releases', v: 'Built by GitHub Actions from a tag, with SHA256SUMS' },
  { k: 'Third-party', v: 'FFmpeg and Anime4K, listed in THIRD_PARTY_NOTICES' }
]

const LINKS = [
  { label: 'Report an issue', href: `${REPO_URL}/issues` },
  { label: 'Read the changelog', href: `${REPO_URL}/blob/main/CHANGELOG.md` },
  { label: 'Browse the source', href: REPO_URL }
]

export const OpenSource: React.FC = () => (
  <Section
    id="open-source"
    eyebrow="Open source"
    title="Built in the open, MIT licensed."
    lead="Read it, run it, fork it. Issues and pull requests are welcome."
  >
    <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
      <Reveal>
        <dl className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
          {FACTS.map((f) => (
            <div key={f.k} className="flex items-baseline justify-between gap-6 py-3.5">
              <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                {f.k}
              </dt>
              <dd className="text-right text-[14px] text-zinc-300">{f.v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-zinc-50 px-4 py-2.5 text-[14px] font-medium text-zinc-950 transition-colors hover:bg-white"
          >
            <GithubIcon className="h-4 w-4" />
            Star on GitHub
          </a>
        </div>

        <ul className="mt-6 space-y-2">
          {LINKS.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[14px] text-zinc-400 transition-colors hover:text-zinc-100"
              >
                {l.label}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-obsidian-900/60">
          <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-2.5">
            <span className="h-2 w-2 rounded-full bg-white/10" />
            <span className="h-2 w-2 rounded-full bg-white/10" />
            <span className="h-2 w-2 rounded-full bg-white/10" />
            <span className="ml-3 font-mono text-[11px] text-zinc-500">run it yourself</span>
          </div>
          <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-7 text-zinc-300">
            <code>
              <span className="text-zinc-500">$ </span>git clone https://github.com/niranjan-7/heimdall.git{'\n'}
              <span className="text-zinc-500">$ </span>cd heimdall{'\n'}
              <span className="text-zinc-500">$ </span>npm install{'\n'}
              <span className="text-zinc-500">$ </span>npm run dev
            </code>
          </pre>
        </div>
        <p className="mt-3 text-[12px] text-zinc-600">
          Verify a download:{' '}
          <span className="font-mono">shasum -a 256 --check --ignore-missing SHA256SUMS.txt</span>
        </p>
      </Reveal>
    </div>
  </Section>
)
