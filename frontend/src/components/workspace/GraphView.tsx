import { Box, List, Loader2, Network, RotateCcw, Search } from 'lucide-react'
import { Suspense, lazy, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { CanvasErrorBoundary } from '@/components/workspace/CanvasErrorBoundary'
import { Graph2D } from '@/components/workspace/Graph2D'
import { GraphList } from '@/components/workspace/GraphList'
import type { ClusterHull, PositionedNode } from '@/lib/graphLayout'
import { LEGEND_KINDS, NODE_KIND_META } from '@/lib/graphVisuals'
import { cn } from '@/lib/utils'
import type { Graph, GraphEdge, PlanItemStatus } from '@/types'

const Graph3D = lazy(() => import('@/components/workspace/Graph3D'))

type ViewMode = 'graph' | 'list'
type RenderMode = '2d' | '3d'

function Toggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { id: T; label: string; icon: typeof Box }[]
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-white/10 bg-slate-950/70 p-0.5 backdrop-blur">
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
            value === id
              ? 'bg-brand/20 text-white shadow-[0_0_12px_-2px_rgba(124,147,255,0.7)]'
              : 'text-slate-400 hover:bg-white/5 hover:text-white',
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}

export function GraphView({
  graph,
  nodes,
  clusters,
  edges,
  selectedId,
  onSelect,
  highlightIds,
  nodeStatus,
  readingOrder,
  truncated,
}: {
  graph: Graph
  nodes: PositionedNode[]
  clusters: ClusterHull[]
  edges: GraphEdge[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  highlightIds?: Set<string>
  nodeStatus?: Map<string, PlanItemStatus>
  readingOrder?: string[]
  truncated?: boolean
}) {
  const [view, setView] = useState<ViewMode>('graph')
  const [render, setRender] = useState<RenderMode>('2d')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const modules = useMemo(() => nodes.filter((node) => node.kind === 'module'), [nodes])

  const searchIds = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return undefined
    const matches = new Set<string>()
    for (const node of nodes) {
      if (
        node.label.toLowerCase().includes(term) ||
        node.file.toLowerCase().includes(term) ||
        node.displayKind.includes(term)
      ) {
        matches.add(node.id)
      }
    }
    return matches
  }, [nodes, query])

  const focusIds = searchIds?.size ? searchIds : highlightIds
  const shared = {
    nodes,
    clusters,
    edges,
    selectedId,
    hoveredId,
    onSelect,
    onHover: setHoveredId,
    focusIds,
    nodeStatus,
    readingOrder,
    resetKey,
  }

  let body: ReactNode
  if (view === 'list') {
    body = (
      <div className="h-full w-full p-4 pt-16">
        <div className="h-full overflow-auto rounded-xl border border-white/10 bg-slate-950/60">
          <GraphList
            graph={graph}
            modules={modules}
            selectedId={selectedId}
            onSelect={onSelect}
            nodeStatus={nodeStatus}
          />
        </div>
      </div>
    )
  } else if (render === '2d') {
    body = (
      <div className="h-full w-full">
        <Graph2D {...shared} />
      </div>
    )
  } else {
    body = (
      <CanvasErrorBoundary
        fallback={
          <div className="h-full w-full">
            <Graph2D {...shared} />
          </div>
        }
      >
        <Suspense
          fallback={
            <div className="grid h-full place-items-center text-slate-400">
              <Loader2 className="size-6 animate-spin" />
            </div>
          }
        >
          <Graph3D {...shared} />
        </Suspense>
      </CanvasErrorBoundary>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-canvas">
      <div className="absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Toggle
            value={view}
            onChange={setView}
            options={[
              { id: 'graph', label: 'Graph', icon: Network },
              { id: 'list', label: 'List', icon: List },
            ]}
          />
          {view === 'graph' ? (
            <Toggle
              value={render}
              onChange={setRender}
              options={[
                { id: '2d', label: '2D', icon: Network },
                { id: '3d', label: '3D', icon: Box },
              ]}
            />
          ) : null}
          {view === 'graph' ? (
            <button
              type="button"
              onClick={() => setResetKey((key) => key + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <RotateCcw className="size-3.5" />
              Reset view
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2.5 size-3.5 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a symbol…"
              aria-label="Search graph nodes"
              className="w-40 rounded-lg border border-white/10 bg-slate-950/80 py-1.5 pl-8 pr-2 text-xs text-slate-100 placeholder:text-slate-500 transition-colors duration-150 focus:border-brand/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 sm:w-56"
            />
          </label>
          <span className="rounded-lg border border-white/10 bg-slate-950/70 px-2 py-1 font-mono text-[11px] text-slate-300">
            {nodes.length} nodes{searchIds?.size ? ` · ${searchIds.size} matches` : ''}
          </span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-end justify-between gap-2 p-3 pt-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1.5 backdrop-blur">
          {LEGEND_KINDS.map((kind) => (
            <span key={kind} className="inline-flex items-center gap-1.5 text-[11px] text-slate-300">
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ backgroundColor: NODE_KIND_META[kind].color }}
              />
              {NODE_KIND_META[kind].label}
            </span>
          ))}
        </div>
        {truncated ? (
          <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-200">
            Graph capped for display
          </span>
        ) : null}
      </div>

      {body}
    </div>
  )
}
