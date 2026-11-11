import React, { createContext, useContext, useMemo } from 'react'
import { MotionConfig, useReducedMotion } from 'framer-motion'
import type { MotionLevel } from '../../../shared/types'

export const DEFAULT_MOTION_LEVEL: MotionLevel = 'reduced'

interface MotionState {
  /** Effective level after honouring the OS "reduce motion" preference. */
  level: MotionLevel
  /** True when any decorative motion should play. */
  enabled: boolean
  /** True only for the richest tier. */
  full: boolean
}

const MotionContext = createContext<MotionState>({ level: 'off', enabled: false, full: false })

export const useMotion = (): MotionState => useContext(MotionContext)

interface MotionProviderProps {
  level?: MotionLevel
  children: (state: MotionState) => React.ReactNode
}

/**
 * Resolves the user's motion setting (and the OS preference) into one effective
 * level, exposes it via context, and tells framer-motion to skip animation when off.
 */
export const MotionProvider: React.FC<MotionProviderProps> = ({ level, children }) => {
  const osReduced = useReducedMotion()
  const state = useMemo<MotionState>(() => {
    const requested = level ?? DEFAULT_MOTION_LEVEL
    const effective: MotionLevel = osReduced ? 'off' : requested
    return { level: effective, enabled: effective !== 'off', full: effective === 'full' }
  }, [level, osReduced])

  return (
    <MotionContext.Provider value={state}>
      <MotionConfig reducedMotion={state.enabled ? 'never' : 'always'}>
        {children(state)}
      </MotionConfig>
    </MotionContext.Provider>
  )
}
