import React from 'react'
import { motion } from 'framer-motion'
import { useMotion } from './MotionProvider'

interface HeroTransitionProps {
  /** Changing this key replays the entrance (e.g. the selected series/movie id). */
  id: string
  children: React.ReactNode
}

/** Fades and lifts the hero banner in whenever the selected title changes. */
export const HeroTransition: React.FC<HeroTransitionProps> = ({ id, children }) => {
  const { enabled } = useMotion()
  if (!enabled) return <>{children}</>
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
