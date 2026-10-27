import React from 'react'
import { cn } from '../../utils/cn'

export interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  blurIntensity?: 'sm' | 'md' | 'lg' | 'xl'
  shadowIntensity?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  borderRadius?: string
  glowIntensity?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'amber'
  isInteractive?: boolean
  isSelected?: boolean
  isPlaying?: boolean
}

/**
 * Global SVG Filter definition for physical optical refraction
 * (inspired by ui-layouts.com/components/liquid-glass)
 */
export const LiquidGlassSvgFilter: React.FC = () => {
  return (
    <svg className="absolute w-0 h-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <defs>
        <filter
          id="liquid-glass-disp"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.015 0.015"
            numOctaves="2"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="8"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  className = '',
  blurIntensity = 'lg',
  shadowIntensity = 'md',
  borderRadius = '16px',
  glowIntensity = 'sm',
  isInteractive = true,
  isSelected = false,
  isPlaying = false,
  style,
  ...props
}) => {
  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-2xl'
  }

  const shadowStyles = {
    none: 'none',
    xs: 'inset 1px 1px 1px 0 rgba(255, 255, 255, 0.15), inset -1px -1px 1px 0 rgba(0, 0, 0, 0.25)',
    sm: 'inset 1px 1px 1.5px 0 rgba(255, 255, 255, 0.22), inset -1px -1px 1.5px 0 rgba(0, 0, 0, 0.3)',
    md: 'inset 1.5px 1.5px 2px 0 rgba(255, 255, 255, 0.28), inset -1.5px -1.5px 2px 0 rgba(0, 0, 0, 0.35)',
    lg: 'inset 2px 2px 3px 0 rgba(255, 255, 255, 0.35), inset -2px -2px 3px 0 rgba(0, 0, 0, 0.4)',
    xl: 'inset 3px 3px 4px 0 rgba(255, 255, 255, 0.45), inset -3px -3px 4px 0 rgba(0, 0, 0, 0.5)'
  }

  const glowStyles = {
    none: '0 4px 12px rgba(0, 0, 0, 0.3)',
    xs: '0 4px 16px rgba(0, 0, 0, 0.35), 0 0 10px rgba(255, 255, 255, 0.04)',
    sm: '0 8px 24px -6px rgba(0, 0, 0, 0.45), 0 0 16px rgba(255, 255, 255, 0.06)',
    md: '0 12px 32px -8px rgba(0, 0, 0, 0.55), 0 0 24px rgba(255, 255, 255, 0.08)',
    lg: '0 16px 40px -10px rgba(0, 0, 0, 0.65), 0 0 32px rgba(255, 255, 255, 0.12)',
    xl: '0 20px 50px -12px rgba(0, 0, 0, 0.75), 0 0 40px rgba(255, 255, 255, 0.16)',
    amber: '0 12px 36px -8px rgba(245, 158, 11, 0.35), 0 0 24px rgba(245, 158, 11, 0.15)'
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        blurClasses[blurIntensity],
        isInteractive && 'hover:-translate-y-1 hover:shadow-2xl cursor-pointer',
        isSelected && 'ring-2 ring-amber-400/80 shadow-amber-500/25',
        isPlaying && 'ring-1 ring-amber-500/60 shadow-amber-500/20',
        className
      )}
      style={{
        borderRadius,
        background: isSelected
          ? 'rgba(38, 30, 18, 0.55)'
          : isPlaying
            ? 'rgba(28, 24, 18, 0.52)'
            : 'rgba(18, 20, 28, 0.38)',
        border: isSelected
          ? '1px solid rgba(245, 158, 11, 0.7)'
          : isPlaying
            ? '1px solid rgba(245, 158, 11, 0.5)'
            : '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: isSelected || isPlaying
          ? `${glowStyles.amber}, ${shadowStyles[shadowIntensity]}`
          : `${glowStyles[glowIntensity]}, ${shadowStyles[shadowIntensity]}`,
        ...style
      }}
      {...props}
    >
      {/* Specular Edge Refraction Highlights (Top Edge Sheen) */}
      <div
        className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none z-10"
      />

      {/* Amber Ambient Caustic Flare on hover/active */}
      {(isPlaying || isSelected) && (
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none z-0" />
      )}

      {/* Card Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  )
}
