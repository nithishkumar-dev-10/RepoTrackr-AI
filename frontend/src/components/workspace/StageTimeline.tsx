import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'

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

      <ol className="mt-4 grid grid-cols-4 gap-2">
        {INDEX_STAGES.map((stage, i) => {
          const done = complete || (activeIndex >= 0 && i < activeIndex)
          const active = !complete && i === activeIndex
          return (
            <li key={stage} className="flex flex-col items-center gap-1.5 text-center">
              <span
                className={cn(
                  'grid size-7 place-items-center rounded-full border text-xs',
                  done && 'border-status-done/30 bg-status-done/15 text-status-done',
                  active && 'border-brand/40 bg-accent text-brand',
                  !done && !active && 'border-border bg-surface text-muted-foreground',
                )}
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
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {STAGE_LABEL[stage]}
              </span>
            </li>
          )
        })}
      </ol>

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
