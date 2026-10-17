import { AnimatePresence, motion } from 'framer-motion'

import { cn } from '@/lib/utils'

/**
 * A single soft expanding ring used to celebrate a success state. Deliberately
 * no particles: just one glow pulse (a static glow under reduced-motion).
 */
export function SuccessRipple({
  show,
  className,
  color = 'rgba(22,163,74,0.45)',
}: {
  show: boolean
  className?: string
  color?: string
}) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.span
          aria-hidden="true"
          initial={{ opacity: 0.8, scale: 0.9 }}
          animate={{ opacity: 0, scale: 1.35 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className={cn(
            'pointer-events-none absolute inset-0 rounded-2xl',
            className,
          )}
          style={{ boxShadow: `0 0 0 5px ${color}` }}
        />
      ) : null}
    </AnimatePresence>
  )
}
