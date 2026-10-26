import React, { useRef } from 'react'
import { motion, useMotionValue, useSpring, useMotionTemplate, useReducedMotion } from 'framer-motion'

export interface TiltCardProps {
  children: React.ReactNode
  className?: string
  accentColor?: string
  variants?: any
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  accentColor = 'rgba(245, 158, 11, 0.22)',
  variants
}) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Spring physics for buttery 3D tilt recovery
  const rotateXSpring = useSpring(0, { stiffness: 180, damping: 20 })
  const rotateYSpring = useSpring(0, { stiffness: 180, damping: 20 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const width = rect.width
    const height = rect.height

    const mouseXFromCenter = e.clientX - rect.left - width / 2
    const mouseYFromCenter = e.clientY - rect.top - height / 2

    // Calculate subtle 3D tilt (max ±4 degrees)
    const rX = -(mouseYFromCenter / (height / 2)) * 4
    const rY = (mouseXFromCenter / (width / 2)) * 4

    rotateXSpring.set(rX)
    rotateYSpring.set(rY)

    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  const handleMouseLeave = () => {
    rotateXSpring.set(0)
    rotateYSpring.set(0)
  }

  return (
    <motion.div
      ref={cardRef}
      variants={variants}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: shouldReduceMotion ? 0 : rotateXSpring,
        rotateY: shouldReduceMotion ? 0 : rotateYSpring,
        transformStyle: 'preserve-3d'
      }}
      className={`relative rounded-3xl glass-panel p-8 border border-white/10 overflow-hidden transform-gpu group transition-colors duration-300 [perspective:1000px] ${className}`}
    >
      {/* Radial spotlight glow following the cursor along the border & surface */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: useMotionTemplate`radial-gradient(360px circle at ${mouseX}px ${mouseY}px, ${accentColor}, transparent 80%)`
        }}
      />
      <div className="relative z-10 h-full flex flex-col justify-between">
        {children}
      </div>
    </motion.div>
  )
}
