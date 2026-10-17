import { motion } from 'framer-motion'

import { passwordChecks, passwordScore } from '@/lib/validation'
import { cn } from '@/lib/utils'

const LABELS = ['Too weak', 'Weak', 'Okay', 'Good', 'Strong'] as const
const COLORS = [
  'bg-status-missing',
  'bg-status-missing',
  'bg-status-partial',
  'bg-brand',
  'bg-status-done',
] as const

export function PasswordStrength({ value }: { value: string }) {
  const score = passwordScore(value)
  const checks = passwordChecks(value)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-border"
          >
            <motion.div
              initial={false}
              animate={{ scaleX: score > i ? 1 : 0 }}
              transition={{ duration: 0.25 }}
              style={{ transformOrigin: 'left' }}
              className={cn('h-full w-full', COLORS[score])}
            />
          </div>
        ))}
        <span className="ml-1 w-16 text-right text-xs text-muted-foreground">
          {value ? LABELS[score] : ''}
        </span>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {[
          ['At least 8 characters', checks.length],
          ['Contains a letter', checks.letter],
          ['Contains a number', checks.digit],
        ].map(([label, ok]) => (
          <li
            key={String(label)}
            className={cn(
              'inline-flex items-center gap-1',
              ok ? 'text-status-done' : 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                ok ? 'bg-status-done' : 'bg-status-unknown',
              )}
            />
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}
