import { ArrowDownLeft, ArrowUpRight, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { NODE_KIND_META } from '@/lib/graphVisuals'
import type { PositionedNode } from '@/lib/graphLayout'

/** Compact detail card for the node selected in the graph. */
export function NodeInspector({
  node,
  neighborCount,
  callers,
  callees,
  onClear,
}: {
  node: PositionedNode
  neighborCount: number
  callers: number
  callees: number
  onClear: () => void
}) {
  const meta = NODE_KIND_META[node.displayKind]
  return (
    <div className="rounded-xl border border-border bg-surface p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {node.label}
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {node.file}:{node.line}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="rounded-md p-1 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
          style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.tint }}
        >
          <span aria-hidden="true" className="size-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
          {meta.label}
        </span>
        {node.isEntry ? <Badge variant="brand">entry</Badge> : null}
        <Badge variant="outline">{neighborCount} links</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ArrowDownLeft className="size-3.5 text-status-done" />
          {callers} callers
        </span>
        <span className="inline-flex items-center gap-1">
          <ArrowUpRight className="size-3.5 text-status-partial" />
          {callees} callees
        </span>
      </div>
    </div>
  )
}
