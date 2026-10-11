import { Box, List, Loader2, Network } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import type { ReactNode } from 'react'

import { CanvasErrorBoundary } from '@/components/workspace/CanvasErrorBoundary'
import { Graph2D } from '@/components/workspace/Graph2D'
import { GraphList } from '@/components/workspace/GraphList'
import type { ClusterCenter, PositionedNode } from '@/lib/graphLayout'
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
    <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-0.5 backdrop-blur">
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            value === id
              ? 'bg-white/10 text-white'
              : 'text-slate-400 hover:text-white',
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
}: {
  graph: Graph
  nodes: PositionedNode[]
  clusters: ClusterCenter[]
  edges: GraphEdge[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  highlightIds?: Set<string>
  nodeStatus?: Map<string, PlanItemStatus>
  readingOrder?: string[]
}) {
  const [view, setView] = useState<ViewMode>('graph')
  const [render, setRender] = useState<RenderMode>('3d')
  const modules = nodes.filter((n) => n.kind === 'module')

  let body: ReactNode
  if (view === 'list') {
    body = (
      <div className="h-full w-full p-4">
        <div className="h-full overflow-auto rounded-xl border border-border bg-surface">
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
      <div className="h-full w-full p-4">
        <div className="h-full w-full rounded-xl border border-white/5 bg-slate-950/40">
          <Graph2D
            nodes={modules}
            clusters={clusters}
            edges={edges}
            selectedId={selectedId}
            onSelect={onSelect}
            highlightIds={highlightIds}
            nodeStatus={nodeStatus}
            readingOrder={readingOrder}
          />
        </div>
      </div>
    )
  } else {
    body = (
      <CanvasErrorBoundary
        fallback={
          <div className="h-full w-full p-4">
            <div className="h-full w-full rounded-xl border border-white/5 bg-slate-950/40">
              <Graph2D
                nodes={modules}
                clusters={clusters}
                edges={edges}
                selectedId={selectedId}
                onSelect={onSelect}
                highlightIds={highlightIds}
                nodeStatus={nodeStatus}
                readingOrder={readingOrder}
              />
            </div>
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
          <Graph3D
            nodes={modules}
            clusters={clusters}
            edges={edges}
            selectedId={selectedId}
            onSelect={onSelect}
            highlightIds={highlightIds}
            nodeStatus={nodeStatus}
            readingOrder={readingOrder}
          />
        </Suspense>
      </CanvasErrorBoundary>
    )
  }

  return (
    <div className="relative h-full w-full bg-canvas">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
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
              { id: '3d', label: '3D', icon: Box },
              { id: '2d', label: '2D', icon: Network },
            ]}
          />
        ) : null}
      </div>

      <div className="h-full w-full pt-14">{body}</div>
    </div>
  )
}
