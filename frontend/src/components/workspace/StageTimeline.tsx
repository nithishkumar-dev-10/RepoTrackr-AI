import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import type { CSSProperties } from 'react'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { INDEX_STAGES } from '@/types'
import type { IndexStatus } from '@/types'

const STAGE_LABEL: Record<string, string> = {
  clone: 'Clone',
  parse: 'Parse',
  graph: 'Graph',
  index: 'Index',
  done: 'Done',
  error: 'Error',
}

export function StageTimeline({
  status,
  demo,
}: {
  status: IndexStatus | null
  demo: boolean
}) {
  const activeIndex = status
    ? INDEX_STAGES.indexOf(status.stage as (typeof INDEX_STAGES)[number])
    : -1
  const progress = status?.progress ?? 0
  const complete = status?.stage === 'done'

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Indexing pipeline</p>
        <div className="flex items-center gap-2">
          {demo ? (
            <Badge variant="outline" className="font-mono">
              Demo data
            </Badge>
          ) : null}
          <span className="font-mono text-xs text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      <Progress value={progress} className="mt-3" />

      <div className="relative mt-4">
        <div
          aria-hidden="true"
          className="absolute left-1 right-1 top-3.5 hidden h-0.5 rounded-full bg-border/70 sm:block"
        />
        <div
          aria-hidden="true"
          className="progress-glow absolute left-1 top-3.5 hidden h-0.5 rounded-full sm:block"
          style={{
            width: `calc((100% - 0.5rem) * ${complete ? 1 : activeIndex > 0 ? activeIndex / INDEX_STAGES.length : 0})`,
            transition: 'width 400ms ease',
          }}
        />
        <ol className="relative grid grid-cols-4 gap-2">
          {INDEX_STAGES.map((stage, i) => {
            const done = complete || (activeIndex >= 0 && i < activeIndex)
            const active = !complete && i === activeIndex
            return (
              <li
                key={stage}
                className="flex flex-col items-center gap-1.5 text-center"
              >
                <span
                  className={cn(
                    'grid size-7 place-items-center rounded-full border text-xs transition-shadow duration-200',
                    done &&
                      'border-status-done/30 bg-status-done/15 text-status-done glow-sm',
                    active &&
                      'pulse-dot border-brand/40 bg-accent text-brand glow-sm',
                    !done &&
                      !active &&
                      'border-border bg-surface text-muted-foreground',
                  )}
                  style={
                    active
                      ? ({ '--glow-soft': 'rgba(59,91,255,0.55)' } as CSSProperties)
                      : undefined
                  }
                >
                  {done ? (
                    <Check className="size-3.5" />
                  ) : active ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <span className="font-mono">{i + 1}</span>
                  )}
                </span>
                <span
                  className={cn(
                    'text-xs',
                    active ? 'font-medium text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {STAGE_LABEL[stage]}
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      {status?.stage === 'error' ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-xs text-destructive"
        >
          Indexing failed.
        </motion.p>
      ) : null}
    </div>
  )
}
