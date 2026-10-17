import { animate, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

export function Counter({
  to,
  suffix = '',
  prefix = '',
  duration = 1.4,
  className,
}: {
  to: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, to, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setValue(v),
    })
    return () => controls.stop()
  }, [inView, to, duration])

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}
      {Math.round(value)}
      {suffix}
    </span>
  )
}
