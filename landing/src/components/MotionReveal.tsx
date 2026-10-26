import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface MotionRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  yOffset?: number
}

export const MotionReveal: React.FC<MotionRevealProps> = ({
  children,
  className = '',
  delay = 0,
  yOffset = 30
}) => {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className={`overflow-hidden ${className}`}>
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { y: yOffset, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 20,
          delay
        }}
        className="transform-gpu"
      >
        {children}
      </motion.div>
    </div>
  )
}
