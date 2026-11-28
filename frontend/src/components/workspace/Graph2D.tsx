import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import { PLAN_STATUS_META } from '@/lib/planStatus'
import { nodeRadius, type ClusterHull, type PositionedNode } from '@/lib/graphLayout'
import { cn } from '@/lib/utils'
import type { GraphEdge, PlanItemStatus } from '@/types'

interface ViewBox {
  x: number
  y: number
  width: number
  height: number
}

function fitView(nodes: PositionedNode[]): ViewBox {
  const xs = nodes.map((node) => node.x)
  const ys = nodes.map((node) => node.z)
  const minX = Math.min(...xs, -10)
  const maxX = Math.max(...xs, 10)
  const minY = Math.min(...ys, -10)
  const maxY = Math.max(...ys, 10)
  const pad = 14
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  }
}

export function Graph2D({
  nodes,
  clusters,
  edges,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  focusIds,
  nodeStatus,
  readingOrder,
  resetKey = 0,
  className,
}: {
  nodes: PositionedNode[]
  clusters: ClusterHull[]
  edges: GraphEdge[]
  selectedId?: string | null
  hoveredId?: string | null
  onSelect?: (id: string) => void
  onHover?: (id: string | null) => void
  focusIds?: Set<string>
  nodeStatus?: Map<string, PlanItemStatus>
  readingOrder?: string[]
  resetKey?: number
  className?: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ x: number; y: number; view: ViewBox } | null>(null)
  const base = useMemo(() => fitView(nodes), [nodes])
  const signature = `${base.x}:${base.y}:${base.width}:${base.height}:${resetKey}`
  const [state, setState] = useState<{ signature: string; view: ViewBox }>({
    signature,
    view: base,
  })
  // A changed graph or reset request falls back to the fitted view without an
  // extra render pass; wheel/pan store their view under the current signature.
  const view = state.signature === signature ? state.view : base
  const setView = (next: ViewBox) => setState({ signature, view: next })

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const matrix = svg.getScreenCTM()
      if (!matrix) return
      const point = svg.createSVGPoint()
      point.x = event.clientX
      point.y = event.clientY
      const cursor = point.matrixTransform(matrix.inverse())
      setState((current) => {
        const currentView = current.signature === signature ? current.view : base
        const factor = event.deltaY > 0 ? 1.12 : 1 / 1.12
        const width = Math.min(
          base.width * 3,
          Math.max(base.width / 6, currentView.width * factor),
        )
        const height = currentView.height * (width / currentView.width)
        const rx = (cursor.x - currentView.x) / currentView.width
        const ry = (cursor.y - currentView.y) / currentView.height
        return {
          signature,
          view: { x: cursor.x - rx * width, y: cursor.y - ry * height, width, height },
        }
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [base, signature])

  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const orderIndex = useMemo(() => {
    const map = new Map<string, number>()
    readingOrder?.forEach((id, index) => map.set(id, index))
    return map
  }, [readingOrder])

  const emphasis = hoveredId ?? selectedId
  const neighbors = useMemo(() => {
    const set = new Set<string>()
    if (!emphasis) return set
    for (const edge of edges) {
      if (edge.source === emphasis) set.add(edge.target)
      if (edge.target === emphasis) set.add(edge.source)
    }
    return set
  }, [edges, emphasis])
  const dimming = Boolean(focusIds?.size) || Boolean(emphasis)
  const isFocused = (id: string) =>
    Boolean(emphasis ? id === emphasis || neighbors.has(id) : focusIds?.has(id))

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, view }
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const active = drag.current
    const svg = svgRef.current
    if (!active || !svg) return
    const rect = svg.getBoundingClientRect()
    const dx = ((event.clientX - active.x) / Math.max(1, rect.width)) * active.view.width
    const dy = ((event.clientY - active.y) / Math.max(1, rect.height)) * active.view.height
    setView({ ...active.view, x: active.view.x - dx, y: active.view.y - dy })
  }

  function endDrag(event: ReactPointerEvent<SVGSVGElement>) {
    if (drag.current) event.currentTarget.releasePointerCapture(event.pointerId)
    drag.current = null
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn('h-full w-full touch-none select-none', className)}
      role="img"
      aria-label="Repository code graph"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <g aria-hidden="true">
        {clusters.map((cluster) => (
          <polygon
            key={cluster.id}
            points={cluster.points.map((point) => point.join(',')).join(' ')}
            fill={cluster.color}
            fillOpacity={0.08}
            stroke={cluster.color}
            strokeOpacity={0.3}
            strokeWidth={0.35}
            strokeDasharray="none"
          />
        ))}
        {clusters.map((cluster) => (
          <text
            key={`${cluster.id}-label`}
            x={cluster.x}
            y={cluster.labelY}
            textAnchor="middle"
            fill="#94A3B8"
            style={{ fontSize: 2.6, fontWeight: 600, letterSpacing: 0.08 }}
          >
            {cluster.label}
          </text>
        ))}
      </g>

      <g>
        {edges.map((edge, index) => {
          const a = byId.get(edge.source)
          const b = byId.get(edge.target)
          if (!a || !b) return null
          const inPath = orderIndex.has(edge.source) && orderIndex.has(edge.target)
          const active = emphasis
            ? edge.source === emphasis || edge.target === emphasis
            : Boolean(
                focusIds && focusIds.size > 0 && focusIds.has(edge.source) && focusIds.has(edge.target),
              )
          return (
            <line
              key={`${edge.source}-${edge.target}-${index}`}
              x1={a.x}
              y1={a.z}
              x2={b.x}
              y2={b.z}
              stroke={active || inPath ? '#7C93FF' : '#64748B'}
              strokeWidth={active ? 0.7 : 0.32}
              strokeOpacity={dimming && !active ? 0.1 : active ? 0.95 : inPath ? 0.55 : 0.28}
            />
          )
        })}
      </g>

      <g>
        {nodes.map((node) => {
          const radius = nodeRadius(node.centrality)
          const status = nodeStatus?.get(node.id)
          const focused = isFocused(node.id)
          const selected = node.id === selectedId
          const hovered = node.id === hoveredId
          const opacity = dimming && !focused ? 0.22 : 1
          return (
            <g
              key={node.id}
              opacity={opacity}
              className={onSelect ? 'cursor-pointer' : undefined}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerEnter={() => onHover?.(node.id)}
              onPointerLeave={() => onHover?.(null)}
              onClick={() => onSelect?.(node.id)}
            >
              <title>{`${node.label} · ${node.displayKind} · ${node.file}:${node.line}`}</title>
              {node.isEntry ? (
                <circle
                  cx={node.x}
                  cy={node.z}
                  r={radius + 1.8}
                  fill="none"
                  stroke="#E2E8F0"
                  strokeOpacity={0.5}
                  strokeWidth={0.35}
                />
              ) : null}
              {status ? (
                <circle
                  cx={node.x}
                  cy={node.z}
                  r={radius + 1.1}
                  fill="none"
                  stroke={PLAN_STATUS_META[status].color}
                  strokeWidth={0.55}
                  strokeOpacity={0.9}
                />
              ) : null}
              <circle
                cx={node.x}
                cy={node.z}
                r={radius}
                fill={node.typeColor}
                fillOpacity={selected || hovered ? 1 : 0.9}
                stroke={selected || hovered ? '#FFFFFF' : focused ? '#CBD5E1' : 'none'}
                strokeWidth={selected ? 0.9 : 0.5}
              />
              {selected || hovered ? (
                <text
                  x={node.x}
                  y={node.z - radius - 1.6}
                  textAnchor="middle"
                  fill="#F8FAFC"
                  style={{ fontSize: 2.5, fontWeight: 600 }}
                >
                  {node.label}
                </text>
              ) : null}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
