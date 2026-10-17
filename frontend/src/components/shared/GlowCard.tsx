import { useReducedMotion } from 'framer-motion'
import type { PointerEvent, ReactNode } from 'react'
import { useRef } from 'react'

import { cn } from '@/lib/utils'

/**
 * Surface card with the shared glow language:
 * - cursor-follow radial spotlight (CSS vars written straight to the DOM so
 *   hover never re-renders),
 * - animated gradient border on hover (`.gradient-border`),
 * - a very slight 3D tilt that is skipped under prefers-reduced-motion.
 */
export function GlowCard({
  children,
  className,
  as: Tag = 'div',
  tilt = true,
  glow = 'accent',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'article' | 'li'
  tilt?: boolean
  glow?: 'accent' | 'violet' | 'cyan'
}) {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  function handleMove(event: PointerEvent<HTMLElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = event.clientX - rect.left
    const py = event.clientY - rect.top
    el.style.setProperty('--spot-x', `${px}px`)
    el.style.setProperty('--spot-y', `${py}px`)
    if (tilt && !reduced) {
      const rx = (py / rect.height - 0.5) * -5
      const ry = (px / rect.width - 0.5) * 5
      el.style.setProperty('--tilt-x', `${rx}deg`)
      el.style.setProperty('--tilt-y', `${ry}deg`)
    }
  }

  function reset() {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--tilt-x', '0deg')
    el.style.setProperty('--tilt-y', '0deg')
  }

  return (
    <Tag
      ref={ref as never}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      className={cn(
        'gradient-border group/glow relative isolate overflow-hidden rounded-2xl border border-border bg-surface shadow-sm',
        'transition-[transform,box-shadow] duration-200 ease-out will-change-transform',
        'hover:shadow-[0_20px_55px_-24px_var(--glow-soft)]',
        glow === 'violet' && 'glow-violet',
        glow === 'cyan' && 'glow-cyan',
        className,
      )}
      style={{
        transform:
          'perspective(900px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))',
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover/glow:opacity-100"
        style={{
          background:
            'radial-gradient(300px circle at var(--spot-x, 50%) var(--spot-y, 0%), var(--glow-spot), transparent 62%)',
        }}
      />
      {children}
    </Tag>
  )
}
