import { motion } from 'framer-motion'
import { BookOpen, ListChecks, Package } from 'lucide-react'

import { cn } from '@/lib/utils'

export type WorkspaceMode = 'reader' | 'plan' | 'context'

export const WORKSPACE_MODES = [
  { id: 'reader', label: 'Reader', icon: BookOpen },
  { id: 'plan', label: 'Plan', icon: ListChecks },
  { id: 'context', label: 'Context', icon: Package },
] as const satisfies ReadonlyArray<{
  id: WorkspaceMode
  label: string
  icon: typeof BookOpen
}>

export function ModeTabs({
  value,
  onChange,
}: {
  value: WorkspaceMode
  onChange: (mode: WorkspaceMode) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Query mode"
      className="inline-flex items-center gap-1 rounded-xl border border-border bg-background p-1"
    >
      {WORKSPACE_MODES.map(({ id, label, icon: Icon }) => {
        const active = value === id
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active ? (
              <motion.span
                layoutId="mode-tab-indicator"
                className="absolute inset-0 rounded-lg bg-surface shadow-sm glow-sm"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}
            <Icon className="relative z-10 size-4" />
            <span className="relative z-10">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
