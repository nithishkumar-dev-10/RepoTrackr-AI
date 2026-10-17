import { motion } from 'framer-motion'
import { ListChecks, Loader2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'

import { uploadPlan } from '@/api/galaxy'
import { CitationChip } from '@/components/CitationChip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'
import { PLAN_STATUS_META } from '@/lib/planStatus'
import type { PlanItemStatus, QueryResponse } from '@/types'

const RING_ORDER: PlanItemStatus[] = ['done', 'partial', 'missing', 'unknown']

export function PlanPanel({
  response,
  query,
  demo,
  loading,
  repoId,
  onUploaded,
  onSelectFile,
}: {
  response?: QueryResponse
  query?: string
  demo?: boolean
  loading?: boolean
  repoId: number
  onUploaded?: () => void
  onSelectFile?: (file: string) => void
}) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  if (loading && !response) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Verifying the plan against the code…
      </div>
    )
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
        <ListChecks className="size-5 text-brand" />
        <p>Upload a plan or ask a question to verify it against the code.</p>
      </div>
    )
  }

  const items = response.planItems ?? []
  const counts = RING_ORDER.reduce<Record<PlanItemStatus, number>>(
    (acc, status) => {
      acc[status] = items.filter((item) => item.status === status).length
      return acc
    },
    { done: 0, partial: 0, missing: 0, unknown: 0 },
  )
  const total = items.length || 1

  let cursor = 0
  const stops = RING_ORDER.map((status) => {
    const start = (cursor / total) * 100
    cursor += counts[status]
    const end = (cursor / total) * 100
    return `${PLAN_STATUS_META[status].color} ${start}% ${end}%`
  })
  const gradient = `conic-gradient(from -90deg, ${stops.join(', ')})`

  async function onFile(file: File) {
    setUploading(true)
    try {
      const result = await uploadPlan(repoId, file)
      toast({
        title:
          result.data.status === 'not_implemented'
            ? 'Plan uploaded (Demo data)'
            : 'Plan uploaded',
        description: file.name,
        variant: 'info',
      })
      onUploaded?.()
    } catch {
      toast({ title: 'Could not upload the plan', variant: 'error' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4 p-4">
      {query ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Query
          </p>
          <p className="text-sm font-medium text-foreground">{query}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">
          Every claim cites real code (file:line).
        </p>
        {demo ? (
          <Badge variant="outline" className="font-mono">
            Demo data
          </Badge>
        ) : null}
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-4">
        <div
          className="relative grid size-20 shrink-0 place-items-center rounded-full"
          style={{
            background: gradient,
            boxShadow: '0 0 22px -4px rgba(59,91,255,0.5)',
          }}
          aria-hidden
        >
          <div className="grid size-12 place-items-center rounded-full bg-background">
            <span className="text-lg font-semibold text-foreground">{items.length}</span>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2">
          {RING_ORDER.map((status) => (
            <div key={status} className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{
                  backgroundColor: PLAN_STATUS_META[status].color,
                  boxShadow: `0 0 8px 1px ${PLAN_STATUS_META[status].color}`,
                }}
              />
              <span className="text-xs text-muted-foreground">
                {PLAN_STATUS_META[status].label}
              </span>
              <span className="ml-auto text-xs font-medium text-foreground">
                {counts[status]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="whitespace-pre-wrap text-sm leading-relaxed text-foreground"
      >
        {response.answer}
      </motion.p>

      {items.length > 0 ? (
        <ul className="space-y-2">
          {RING_ORDER.flatMap((status) =>
            items
              .filter((item) => item.status === status)
              .map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    'rounded-lg border-l-2 bg-background px-3 py-2',
                  )}
                  style={{
                    borderLeftColor: PLAN_STATUS_META[item.status].color,
                    boxShadow: `-6px 0 18px -12px ${PLAN_STATUS_META[item.status].color}`,
                    transition: 'box-shadow 200ms ease',
                  }}
                >
                  <div className="flex items-start gap-2">
                    <Badge
                      variant="outline"
                      className="shrink-0 font-mono text-[10px]"
                      style={{ color: PLAN_STATUS_META[item.status].color }}
                    >
                      {PLAN_STATUS_META[item.status].label}
                    </Badge>
                    <p className="text-sm text-foreground">{item.text}</p>
                  </div>
                  {item.evidence.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.evidence.map((citation, i) => (
                        <CitationChip
                          key={`${item.id}-${citation.file}-${citation.line}-${i}`}
                          citation={citation}
                          onClick={() => onSelectFile?.(citation.file)}
                        />
                      ))}
                    </div>
                  ) : null}
                </li>
              )),
          )}
        </ul>
      ) : null}

      <div>
        <input
          ref={inputRef}
          type="file"
          accept=".md,.markdown,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void onFile(file)
            e.target.value = ''
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Upload a plan
        </Button>
      </div>
    </div>
  )
}
