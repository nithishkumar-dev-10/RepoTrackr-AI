import { X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { PositionedNode } from '@/lib/graphLayout'

/** Compact detail card for the node selected in the graph. */
export function NodeInspector({
  node,
  neighborCount,
  onClear,
}: {
  node: PositionedNode
  neighborCount: number
  onClear: () => void
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {node.label}
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {node.file}:{node.line}
          </p>
        </div>
        <button
          onClick={onClear}
          aria-label="Clear selection"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="unknown">{node.kind}</Badge>
        {node.isEntry ? <Badge variant="brand">entry</Badge> : null}
        <Badge variant="outline">{neighborCount} links</Badge>
      </div>
    </div>
  )
}
