import { motion } from 'framer-motion'
import { Check, Loader2, RotateCcw } from 'lucide-react'
import type { CSSProperties } from 'react'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { INDEX_RUN_STAGES } from '@/types'
import type { IndexRunStatus } from '@/types'

const STAGE_LABEL: Record<string, string> = {
  queued: 'Queued',
  cloning: 'Clone',
  indexing: 'Index',
  ready: 'Ready',
  failed: 'Failed',
}

export function StageTimeline({
  status,
  onRetry,
  retrying = false,
}: {
  status: IndexRunStatus | null
  onRetry: () => void
  retrying?: boolean
}) {
  const stage = status?.status ?? 'added'
  const activeIndex = INDEX_RUN_STAGES.indexOf(
    stage as (typeof INDEX_RUN_STAGES)[number],
  )
  const complete = stage === 'ready'
  const failed = stage === 'failed'
  const progress = complete
    ? 100
    : failed || activeIndex < 0
      ? 0
      : (activeIndex / (INDEX_RUN_STAGES.length - 1)) * 100

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Indexing pipeline</p>
        <span className="font-mono text-xs text-muted-foreground">
          {status ? stage : 'added'}
        </span>
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
            width: `calc((100% - 0.5rem) * ${progress / 100})`,
            transition: 'width 400ms ease',
          }}
        />
        <ol className="relative grid grid-cols-4 gap-2">
          {INDEX_RUN_STAGES.map((item, i) => {
            const done = complete || (activeIndex >= 0 && i < activeIndex)
            const active = !complete && !failed && i === activeIndex
            return (
              <li
                key={item}
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
                  {STAGE_LABEL[item]}
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      {failed ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3"
        >
          <p className="max-w-full break-words text-xs text-destructive">
            {status?.error_message || 'Indexing failed.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={retrying}
          >
            {retrying ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RotateCcw className="size-3.5" />
            )}
            Retry
          </Button>
        </motion.div>
      ) : null}
    </div>
  )
}
