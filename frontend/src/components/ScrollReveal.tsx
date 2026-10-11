import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

import { EASE, viewportOnce } from '@/lib/motion'

export function ScrollReveal({
  children,
  delay = 0,
  y = 18,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.55, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}
