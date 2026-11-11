import React, { Suspense, lazy, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Download } from 'lucide-react'
import { GithubIcon } from './Icons'
import { OS_LABEL, REPO_URL, RELEASES_URL, detectOs, type Os } from '../lib/site'
import { useLatestVersion } from '../lib/useLatestVersion'

// three.js is the heaviest dependency: load it after the first paint.
const WatcherScene = lazy(() => import('./WatcherScene'))

export const HeroSection: React.FC = () => {
  const [os] = useState<Os>(detectOs)
  const version = useLatestVersion()
  const reduce = useReducedMotion()

  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const }
        }

  return (
    <section id="top" className="relative overflow-hidden pt-14">
      <div className="mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-5xl items-center gap-4 px-6 py-16 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <motion.p
            {...fade(0)}
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500"
          >
            Open source · MIT licensed
          </motion.p>

          <motion.h1
            {...fade(0.08)}
            className="mt-6 text-balance text-4xl font-medium leading-[1.08] tracking-tight text-zinc-50 sm:text-5xl lg:text-[3.4rem]"
          >
            The all-seeing companion for your local media.
          </motion.h1>

          <motion.p
            {...fade(0.16)}
            className="mt-6 max-w-lg text-[16px] leading-relaxed text-zinc-400"
          >
            Heimdall sits beside VLC or mpv. It remembers where you stopped, lines subtitles up with
            the audio, and keeps your anime in step with AniList. Free, local, no account.
          </motion.p>

          <motion.div {...fade(0.24)} className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-zinc-50 px-4 py-2.5 text-[14px] font-medium text-zinc-950 transition-colors hover:bg-white"
            >
              <Download className="h-4 w-4" />
              Download for {OS_LABEL[os]}
            </a>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-2.5 text-[14px] text-zinc-200 transition-colors hover:border-white/25 hover:bg-white/[0.04]"
            >
              <GithubIcon className="h-4 w-4" />
              View on GitHub
              <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500" />
            </a>
          </motion.div>

          <motion.p
            {...fade(0.32)}
            className="mt-6 font-mono text-[11px] tracking-wide text-zinc-600"
          >
            v{version} · Windows · macOS · Linux · needs VLC or mpv
          </motion.p>
        </div>

        <div className="relative mx-auto h-[340px] w-full max-w-[460px] md:h-[520px] md:max-w-none">
          <Suspense fallback={null}>
            <motion.div
              className="h-full w-full"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.4, delay: 0.2 }}
            >
              <WatcherScene />
            </motion.div>
          </Suspense>
        </div>
      </div>
    </section>
  )
}
