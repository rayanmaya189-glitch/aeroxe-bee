import type { Variants } from 'framer-motion'

// ── Container variants for staggered children ──
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

export const staggerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
}

// ── Item variants ──
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

// ── Item variant (compact, for lists/grids) ──
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

// ── Hover & interaction ──
export const magneticHover = {
  scale: 1.02,
  transition: { type: 'spring', stiffness: 400, damping: 25 },
}

export const cardHover = {
  y: -4,
  transition: { type: 'spring', stiffness: 400, damping: 25 },
}

// ── Ambient float ──
export const float: Variants = {
  hidden: {},
  visible: {
    y: [-6, 6, -6],
    transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
  },
}

// ── Blur reveal for hero-style headers ──
export const blurReveal: Variants = {
  hidden: { opacity: 0, filter: 'blur(8px)', y: 16 },
  visible: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

// ── Progress bar fill ──
export const progressFill = {
  hidden: { width: 0 },
  visible: (bar: number) => ({
    width: `${bar}%`,
    transition: { duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] },
  }),
}
