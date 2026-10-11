import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

/** Entry animation wrapper used by every routed page. */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="min-h-full"
    >
      {children}
    </motion.div>
  )
}
