import { motion } from 'framer-motion'
import { Check, Loader2, RotateCcw, X } from 'lucide-react'
import type { CSSProperties } from 'react'

import { STATUS_COLOR } from '@/lib/designTokens'
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

const GREEN_BAR = {
  '--progress-a': '#047857',
  '--progress-b': '#0F766E',
  '--progress-c': '#34D399',
  '--progress-glow': 'rgba(4,120,87,0.6)',
} as CSSProperties

const RED_BAR = {
  '--progress-a': '#BE123C',
  '--progress-b': '#DC2626',
  '--progress-c': '#FB7185',
  '--progress-glow': 'rgba(190,18,60,0.6)',
} as CSSProperties

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
  // A failure is reported on the last real work stage, not on `ready`.
  const failedIndex = failed ? INDEX_RUN_STAGES.length - 2 : -1
  const progress = complete
    ? 100
    : failed || activeIndex < 0
      ? 0
      : (activeIndex / (INDEX_RUN_STAGES.length - 1)) * 100

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Indexing pipeline</p>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 font-mono text-xs',
            failed
              ? 'bg-rose-tint text-rose'
              : complete
                ? 'bg-emerald-tint text-emerald'
                : 'text-muted-foreground',
          )}
        >
          {status ? stage : 'added'}
        </span>
      </div>

      <Progress
        value={failed ? 100 : progress}
        className="mt-3"
        style={failed ? RED_BAR : GREEN_BAR}
      />

      <div className="relative mt-4">
        <div
          aria-hidden="true"
          className="absolute left-1 right-1 top-3.5 hidden h-0.5 rounded-full bg-border/70 sm:block"
        />
        <div
          aria-hidden="true"
          className="progress-glow absolute left-1 top-3.5 hidden h-0.5 rounded-full sm:block"
          style={{
            ...(failed ? RED_BAR : GREEN_BAR),
            width: `calc((100% - 0.5rem) * ${failed ? 1 : progress / 100})`,
            transition: 'width 200ms ease',
          }}
        />
        <ol className="relative grid grid-cols-4 gap-2">
          {INDEX_RUN_STAGES.map((item, i) => {
            const done = complete || (activeIndex >= 0 && i < activeIndex)
            const active = !complete && !failed && i === activeIndex
            const isFailed = failed && i === failedIndex
            return (
              <li
                key={item}
                className="flex flex-col items-center gap-1.5 text-center"
              >
                <motion.span
                  key={`${item}-${isFailed ? 'failed' : active ? 'active' : 'idle'}`}
                  initial={{ scale: 0.85, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'grid size-7 place-items-center rounded-full border text-xs transition-colors duration-200',
                    done &&
                      'border-emerald/30 bg-emerald-tint text-emerald glow-sm',
                    active &&
                      'pulse-dot border-emerald/40 bg-emerald-tint text-emerald',
                    isFailed && 'border-rose/40 bg-rose-tint text-rose glow-sm',
                    !done && !active && !isFailed &&
                      'border-border bg-surface text-muted-foreground',
                  )}
                  style={
                    active
                      ? ({ '--glow-soft': 'rgba(4,120,87,0.45)' } as CSSProperties)
                      : isFailed
                        ? ({ '--glow-soft': 'rgba(190,18,60,0.4)' } as CSSProperties)
                        : undefined
                  }
                >
                  {isFailed ? (
                    <X className="size-3.5" />
                  ) : done ? (
                    <Check className="size-3.5" />
                  ) : active ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <span className="font-mono">{i + 1}</span>
                  )}
                </motion.span>
                <span
                  className={cn(
                    'text-xs',
                    isFailed
                      ? 'font-medium text-rose'
                      : active
                        ? 'font-medium text-emerald'
                        : 'text-muted-foreground',
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
          transition={{ duration: 0.2 }}
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose/30 bg-rose-tint p-3"
        >
          <p
            className="max-w-full break-words text-xs"
            style={{ color: STATUS_COLOR.missing }}
          >
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
