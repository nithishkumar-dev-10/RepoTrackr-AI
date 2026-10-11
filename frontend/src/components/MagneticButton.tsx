import { motion, useMotionValue, useSpring } from 'framer-motion'
import type { PointerEvent, ReactNode } from 'react'
import { useRef } from 'react'

/**
 * Wraps a primary action so it gently follows the cursor on hover.
 * Movement is disabled automatically under prefers-reduced-motion because
 * CSS kills the transition and the spring stays at rest.
 */
export function MagneticButton({
  children,
  strength = 0.3,
  className,
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 260, damping: 18, mass: 0.5 })
  const springY = useSpring(y, { stiffness: 260, damping: 18, mass: 0.5 })

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    x.set((event.clientX - (rect.left + rect.width / 2)) * strength)
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength)
  }

  function reset() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      className={className}
    >
      {children}
    </motion.div>
  )
}
