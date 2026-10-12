import { motion } from 'framer-motion'
import { BookOpen, Loader2 } from 'lucide-react'

import { CitationChip } from '@/components/CitationChip'
import { CodeBlock } from '@/components/workspace/CodeBlock'
import { Badge } from '@/components/ui/badge'
import type { PositionedNode } from '@/lib/graphLayout'
import { cn } from '@/lib/utils'
import type { QueryResponse } from '@/types'

export function ReaderPanel({
  response,
  query,
  demo,
  loading,
  nodes,
  selectedId,
  onSelectNode,
  onSelectFile,
}: {
  response?: QueryResponse
  query?: string
  demo?: boolean
  loading?: boolean
  nodes: PositionedNode[]
  selectedId?: string | null
  onSelectNode?: (id: string) => void
  onSelectFile?: (file: string) => void
}) {
  if (loading && !response) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Reading the codebase…
      </div>
    )
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
        <BookOpen className="size-5 text-brand" />
        <p>Ask a question with ⌘K to trace how the code actually works.</p>
      </div>
    )
  }

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const order = response.readingOrder ?? []

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

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="whitespace-pre-wrap text-sm leading-relaxed text-foreground"
      >
        {response.answer}
      </motion.p>

      {order.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Reading order
          </p>
          <ol className="space-y-2">
            {order.map((id, i) => {
              const node = byId.get(id)
              const citation = response.citations.find(
                (c) => c.file === node?.file,
              )
              return (
                <li key={`${id}-${i}`}>
                  <button
                    onClick={() => {
                      onSelectNode?.(id)
                      if (node) onSelectFile?.(node.file)
                    }}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                      selectedId === id
                        ? 'border-brand/40 bg-accent'
                        : 'border-border hover:bg-background',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-canvas text-[10px] font-semibold text-white">
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate text-sm font-medium text-foreground">
                        {node?.label ?? id}
                      </span>
                      {node ? (
                        <span className="font-mono text-xs text-muted-foreground">
                          {node.file}:{node.line}
                        </span>
                      ) : null}
                    </div>
                    {citation ? (
                      <div className="mt-2">
                        <CodeBlock code={citation.snippet} className="max-h-56" />
                      </div>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      ) : null}

      {response.citations.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Citations
          </p>
          <div className="flex flex-wrap gap-2">
            {response.citations.map((citation, i) => (
              <CitationChip
                key={`${citation.file}-${citation.line}-${i}`}
                citation={citation}
                onClick={() => onSelectFile?.(citation.file)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
