import { useEffect, useMemo, useRef, useState } from 'react'

import type { PositionedNode } from '@/lib/graphLayout'
import { PLAN_STATUS_META } from '@/lib/planStatus'
import { cn } from '@/lib/utils'
import type { Graph, PlanItemStatus } from '@/types'

function safeId(prefix: string, index: number): string {
  return `${prefix}${index}`
}

export function GraphList({
  graph,
  modules,
  selectedId,
  onSelect,
  nodeStatus,
  className,
}: {
  graph: Graph
  modules: PositionedNode[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  nodeStatus?: Map<string, PlanItemStatus>
  className?: string
}) {
  const [svg, setSvg] = useState('')
  const [failed, setFailed] = useState(false)
  const renderId = useRef(0)

  const text = useMemo(() => {
    const moduleNodes = graph.nodes.filter((n) => n.kind === 'module')
    const ids = new Map<string, string>()
    moduleNodes.forEach((n, i) => ids.set(n.id, safeId('m', i)))
    const edgeLines: string[] = []
    for (const edge of graph.edges) {
      const a = ids.get(edge.source)
      const b = ids.get(edge.target)
      if (a && b) edgeLines.push(`  ${a} --> ${b}`)
    }
    const lines: string[] = ['flowchart TB']
    for (const cluster of graph.clusters) {
      const members = moduleNodes.filter((n) => n.cluster === cluster.id)
      if (members.length === 0) continue
      lines.push(`  subgraph ${safeId('c', graph.clusters.indexOf(cluster))}["${cluster.label}"]`)
      for (const m of members) {
        lines.push(`    ${ids.get(m.id)}["${m.label}"]`)
      }
      lines.push('  end')
    }
    return [...lines, ...edgeLines].join('\n')
  }, [graph])

  useEffect(() => {
    let cancelled = false
    renderId.current += 1
    const current = `rt-graph-${renderId.current}`
    ;(async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: {
            fontFamily: 'inherit',
            primaryColor: '#E8ECFF',
            primaryBorderColor: '#C7D0FF',
            primaryTextColor: '#0B1020',
            lineColor: '#94A3B8',
          },
        })
        const { svg } = await mermaid.render(current, text)
        if (!cancelled) setSvg(svg)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [text])

  return (
    <div className={cn('flex h-full flex-col gap-4 overflow-auto p-4', className)}>
      <div className="rounded-xl border border-border bg-surface p-3">
        {failed || !svg ? (
          <p className="p-4 text-sm text-muted-foreground">
            {failed
              ? 'Diagram unavailable — showing the module list below.'
              : 'Rendering diagram…'}
          </p>
        ) : (
          <div
            className="[&_svg]:h-auto [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>

      <div className="space-y-4">
        {graph.clusters.map((cluster) => {
          const members = modules.filter((m) => m.cluster === cluster.id)
          if (members.length === 0) return null
          return (
            <div key={cluster.id}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {cluster.label}
              </p>
              <ul className="space-y-1">
                {members.map((node) => {
                  const status = nodeStatus?.get(node.id)
                  return (
                    <li key={node.id}>
                      <button
                        onClick={() => onSelect?.(node.id)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                          node.id === selectedId
                            ? 'border-brand/40 bg-accent'
                            : 'border-transparent hover:bg-background',
                        )}
                      >
                        {status ? (
                          <span
                            className="size-2 rounded-full"
                            style={{
                              backgroundColor: PLAN_STATUS_META[status].color,
                              boxShadow: `0 0 8px 1px ${PLAN_STATUS_META[status].color}`,
                            }}
                          />
                        ) : (
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: node.clusterColor }}
                          />
                        )}
                        <span className="flex-1 truncate text-foreground">
                          {node.label}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {node.file}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
