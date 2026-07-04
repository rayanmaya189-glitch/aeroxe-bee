import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface FloatingShape {
  id: number
  x: string
  y: string
  size: number
  delay: number
  duration: number
  color: string
}

export function OnboardingBackground() {
  const shapes = useMemo<FloatingShape[]>(() => [
    { id: 1, x: '10%', y: '20%', size: 120, delay: 0, duration: 20, color: 'from-blue-500/20 to-cyan-500/10' },
    { id: 2, x: '80%', y: '15%', size: 80, delay: 2, duration: 25, color: 'from-purple-500/15 to-pink-500/10' },
    { id: 3, x: '70%', y: '70%', size: 100, delay: 4, duration: 22, color: 'from-amber-500/10 to-orange-500/5' },
    { id: 4, x: '20%', y: '75%', size: 60, delay: 1, duration: 18, color: 'from-emerald-500/15 to-teal-500/10' },
    { id: 5, x: '50%', y: '40%', size: 150, delay: 3, duration: 30, color: 'from-violet-500/10 to-indigo-500/5' },
  ], [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Gradient orbs */}
      <div className="absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-blue-600/8 blur-[150px]" />
      <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-purple-600/8 blur-[120px]" />

      {/* Floating shapes */}
      {shapes.map((shape) => (
        <motion.div
          key={shape.id}
          className={`absolute rounded-full bg-gradient-to-br ${shape.color} blur-xl`}
          style={{
            width: shape.size,
            height: shape.size,
            left: shape.x,
            top: shape.y,
          }}
          animate={{
            y: [0, -30, 0, 20, 0],
            x: [0, 15, -10, 5, 0],
            scale: [1, 1.1, 0.95, 1.05, 1],
          }}
          transition={{
            duration: shape.duration,
            delay: shape.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030712]/80" />
    </div>
  )
}
