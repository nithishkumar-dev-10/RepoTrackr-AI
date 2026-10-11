import { motion } from 'framer-motion'
import { Check, Copy, Loader2, Package } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/context/ToastContext'
import type { PositionedNode } from '@/lib/graphLayout'
import { cn } from '@/lib/utils'
import type { QueryResponse } from '@/types'

function TierChips({
  ids,
  nodes,
  onSelect,
}: {
  ids: string[]
  nodes: Map<string, PositionedNode>
  onSelect?: (id: string) => void
}) {
  if (ids.length === 0) {
    return <p className="text-xs text-muted-foreground">None</p>
  }
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const node = nodes.get(id)
        return (
          <button
            key={id}
            onClick={() => onSelect?.(id)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground transition-colors hover:border-brand/40 hover:text-brand"
          >
            {node ? (
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: node.clusterColor }}
              />
            ) : null}
            <span className="max-w-48 truncate font-mono">
              {node?.file ?? id}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function ContextPanel({
  response,
  query,
  demo,
  loading,
  nodes,
  onSelectNode,
}: {
  response?: QueryResponse
  query?: string
  demo?: boolean
  loading?: boolean
  nodes: PositionedNode[]
  onSelectNode?: (id: string) => void
}) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  if (loading && !response) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Packing context…
      </div>
    )
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
        <Package className="size-5 text-brand" />
        <p>Ask a question with ⌘K to pack a token-budgeted context.</p>
      </div>
    )
  }

  const packed = response.packed
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const pct = packed ? Math.min(100, (packed.tokensUsed / packed.tokenBudget) * 100) : 0

  async function copyPrompt() {
    if (!packed) return
    try {
      await navigator.clipboard.writeText(packed.prompt)
      setCopied(true)
      toast({ title: 'Prompt copied', variant: 'success' })
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast({ title: 'Could not copy the prompt', variant: 'error' })
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
          Static analysis decides what is true. AI only retrieves and explains.
        </p>
        {demo ? (
          <Badge variant="outline" className="font-mono">
            Demo data
          </Badge>
        ) : null}
      </div>

      {packed ? (
        <>
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Token budget</p>
              <span className="font-mono text-xs text-muted-foreground">
                {packed.tokensUsed.toLocaleString()} /{' '}
                {packed.tokenBudget.toLocaleString()}
              </span>
            </div>
            <Progress value={pct} className="mt-3" />
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Full context
              </p>
              <TierChips ids={packed.tiers.full} nodes={byId} onSelect={onSelectNode} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Signatures
              </p>
              <TierChips
                ids={packed.tiers.signature}
                nodes={byId}
                onSelect={onSelectNode}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Packed markdown
            </p>
            <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-background p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground">
              {packed.markdown}
            </pre>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ready-to-use prompt
              </p>
              <Button variant="outline" size="sm" onClick={() => void copyPrompt()}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <pre
              className={cn(
                'max-h-72 overflow-auto rounded-lg border border-border bg-canvas p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-white/90',
              )}
            >
              {packed.prompt}
            </pre>
          </div>
        </>
      ) : (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="whitespace-pre-wrap text-sm leading-relaxed text-foreground"
        >
          {response.answer}
        </motion.p>
      )}
    </div>
  )
}
