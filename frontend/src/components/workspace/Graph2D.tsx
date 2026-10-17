import { useMemo } from 'react'

import type { ClusterCenter, PositionedNode } from '@/lib/graphLayout'
import { cn } from '@/lib/utils'
import type { GraphEdge, PlanItemStatus } from '@/types'

const STATUS_COLOR: Record<PlanItemStatus, string> = {
  done: '#16A34A',
  partial: '#F59E0B',
  missing: '#DC2626',
  unknown: '#64748B',
}

export function Graph2D({
  nodes,
  clusters,
  edges,
  selectedId,
  onSelect,
  highlightIds,
  nodeStatus,
  readingOrder,
  className,
}: {
  nodes: PositionedNode[]
  clusters: ClusterCenter[]
  edges: GraphEdge[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  highlightIds?: Set<string>
  nodeStatus?: Map<string, PlanItemStatus>
  readingOrder?: string[]
  className?: string
}) {
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const view = useMemo(() => {
    const xs = nodes.map((n) => n.x)
    const ys = nodes.map((n) => n.z)
    const minX = Math.min(...xs, -1)
    const maxX = Math.max(...xs, 1)
    const minY = Math.min(...ys, -1)
    const maxY = Math.max(...ys, 1)
    const pad = 6
    return {
      minX: minX - pad,
      minY: minY - pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
    }
  }, [nodes])

  const orderIndex = useMemo(() => {
    const map = new Map<string, number>()
    readingOrder?.forEach((id, i) => map.set(id, i))
    return map
  }, [readingOrder])

  const dimming = Boolean(highlightIds && highlightIds.size > 0)

  return (
    <svg
      viewBox={`${view.minX} ${view.minY} ${view.width} ${view.height}`}
      className={cn('h-full w-full', className)}
      role="img"
      aria-label="Repository module graph"
    >
      <g>
        {edges.map((edge, i) => {
          const a = byId.get(edge.source)
          const b = byId.get(edge.target)
          if (!a || !b) return null
          const inPath =
            orderIndex.has(edge.source) && orderIndex.has(edge.target)
          const active = dimming && highlightIds?.has(edge.source) && highlightIds?.has(edge.target)
          return (
            <line
              key={`${edge.source}-${edge.target}-${i}`}
              x1={a.x}
              y1={a.z}
              x2={b.x}
              y2={b.z}
              stroke={inPath ? '#3B5BFF' : '#334155'}
              strokeWidth={inPath ? 0.5 : 0.3}
              strokeOpacity={dimming && !active ? 0.15 : inPath ? 0.8 : 0.5}
            />
          )
        })}
      </g>

      <g>
        {clusters.map((c) => (
          <text
            key={c.id}
            x={c.x}
            y={c.z - 8}
            textAnchor="middle"
            className="fill-slate-500"
            style={{ fontSize: 2.4, fontWeight: 600 }}
          >
            {c.label}
          </text>
        ))}
      </g>

      <g>
        {nodes.map((node) => {
          const r = 1.6 + node.centrality * 4
          const status = nodeStatus?.get(node.id)
          const fill = status ? STATUS_COLOR[status] : node.clusterColor
          const highlighted = highlightIds?.has(node.id)
          const dimmed = dimming && !highlighted
          const selected = node.id === selectedId
          return (
            <g
              key={node.id}
              opacity={dimmed ? 0.2 : 1}
              className={onSelect ? 'cursor-pointer' : undefined}
              onClick={() => onSelect?.(node.id)}
            >
              <title>{`${node.label} · ${node.file}:${node.line}`}</title>
              {node.isEntry ? (
                <circle
                  cx={node.x}
                  cy={node.z}
                  r={r + 1.6}
                  fill="none"
                  stroke="#E4E7EF"
                  strokeWidth={0.4}
                  strokeDasharray="1 1"
                />
              ) : null}
              <circle
                cx={node.x}
                cy={node.z}
                r={r}
                fill={fill}
                fillOpacity={selected ? 1 : 0.85}
                stroke={selected ? '#FFFFFF' : highlighted ? '#FFFFFF' : 'transparent'}
                strokeWidth={selected ? 0.8 : 0.5}
              />
            </g>
          )
        })}
      </g>
    </svg>
  )
}
