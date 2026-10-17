import { ArrowLeft, GitBranch, Loader2 } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { buildContext, getGraph, getIndexStatus, queryRepo } from '@/api/galaxy'
import { getRepo, mapRepoStatus, REPO_STATUS_LABEL } from '@/api/repos'
import { CommandBar } from '@/components/workspace/CommandBar'
import { GraphView } from '@/components/workspace/GraphView'
import { ModePanel } from '@/components/workspace/ModePanel'
import { ModeTabs, type WorkspaceMode } from '@/components/workspace/ModeTabs'
import { NodeInspector } from '@/components/workspace/NodeInspector'
import { StageTimeline } from '@/components/workspace/StageTimeline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/context/ToastContext'
import { buildAdjacency, layoutGraph } from '@/lib/graphLayout'
import { cn } from '@/lib/utils'
import type {
  Graph,
  IndexStatus,
  PlanItemStatus,
  QueryResponse,
  Repo,
} from '@/types'

const DEFAULT_QUERY: Record<WorkspaceMode, string> = {
  reader: 'Explain the main entry points and how they connect.',
  plan: 'Verify the plan against the code that exists.',
  context: 'Pack the context needed to add a new feature.',
}

const SEVERITY: Record<PlanItemStatus, number> = {
  done: 1,
  unknown: 2,
  partial: 3,
  missing: 4,
}

type ModeResult = { response: QueryResponse; demo: boolean }

export default function RepoWorkspace() {
  const { id: idParam } = useParams()
  const repoId = Number(idParam)
  const { toast } = useToast()
  const containerRef = useRef<HTMLDivElement>(null)

  const [repo, setRepo] = useState<Repo | null>(null)
  const [graph, setGraph] = useState<Graph | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [status, setStatus] = useState<IndexStatus | null>(null)
  const [statusDemo, setStatusDemo] = useState(false)

  const [mode, setMode] = useState<WorkspaceMode>('reader')
  const [results, setResults] = useState<Partial<Record<WorkspaceMode, ModeResult>>>({})
  const [queries, setQueries] = useState<Partial<Record<WorkspaceMode, string>>>({})
  const [loadingMode, setLoadingMode] = useState<WorkspaceMode | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelWidth, setPanelWidth] = useState(440)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    ;(async () => {
      try {
        const [loadedRepo, loadedGraph] = await Promise.all([
          getRepo(repoId),
          getGraph(repoId),
        ])
        if (cancelled) return
        setRepo(loadedRepo)
        setGraph(loadedGraph.data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Repository not found.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [repoId])

  useEffect(() => {
    if (!repo) return
    if (mapRepoStatus(repo.status) === 'ready') {
      setStatus({ stage: 'done', progress: 100 })
      return
    }
    let timer = 0
    let stopped = false
    const tick = async () => {
      try {
        const { data, demo } = await getIndexStatus(repo.id)
        if (stopped) return
        setStatus(data)
        setStatusDemo(demo)
        if (data.stage === 'done' || data.stage === 'error') {
          window.clearInterval(timer)
        }
      } catch {
        window.clearInterval(timer)
      }
    }
    void tick()
    timer = window.setInterval(tick, 1200)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [repo])

  const layout = useMemo(() => (graph ? layoutGraph(graph) : null), [graph])
  const nodes = useMemo(() => layout?.nodes ?? [], [layout])
  const clusters = useMemo(() => layout?.clusters ?? [], [layout])
  const edges = useMemo(() => graph?.edges ?? [], [graph])
  const adjacency = useMemo(
    () => (graph ? buildAdjacency(graph) : new Map<string, Set<string>>()),
    [graph],
  )

  const runQuery = useCallback(
    async (target: WorkspaceMode, query: string) => {
      setLoadingMode(target)
      try {
        const result =
          target === 'context'
            ? await buildContext(repoId, query)
            : await queryRepo(repoId, query, target)
        setResults((prev) => ({ ...prev, [target]: result }))
        setQueries((prev) => ({ ...prev, [target]: query }))
      } catch {
        toast({ title: 'Query failed', variant: 'error' })
      } finally {
        setLoadingMode(null)
      }
    },
    [repoId, toast],
  )

  useEffect(() => {
    if (!repo || results[mode]) return
    void runQuery(mode, queries[mode] ?? DEFAULT_QUERY[mode])
  }, [mode, repo, results, queries, runQuery])

  const nodeStatus = useMemo(() => {
    const items = results.plan?.response.planItems
    if (!items) return undefined
    const fileToNodes = new Map<string, string[]>()
    for (const node of nodes) {
      const list = fileToNodes.get(node.file) ?? []
      list.push(node.id)
      fileToNodes.set(node.file, list)
    }
    const map = new Map<string, PlanItemStatus>()
    for (const item of items) {
      for (const evidence of item.evidence) {
        for (const nodeId of fileToNodes.get(evidence.file) ?? []) {
          const current = map.get(nodeId)
          if (!current || SEVERITY[item.status] > SEVERITY[current]) {
            map.set(nodeId, item.status)
          }
        }
      }
    }
    return map
  }, [results.plan, nodes])

  const highlightIds = useMemo(() => {
    const set = new Set<string>()
    if (mode === 'reader') {
      results.reader?.response.readingOrder?.forEach((id) => set.add(id))
    } else if (mode === 'context') {
      const packed = results.context?.response.packed
      packed?.tiers.full.forEach((id) => set.add(id))
      packed?.tiers.signature.forEach((id) => set.add(id))
    } else if (mode === 'plan') {
      nodeStatus?.forEach((_, id) => set.add(id))
    }
    return set.size > 0 ? set : undefined
  }, [mode, results, nodeStatus])

  const readingOrder =
    mode === 'reader' ? results.reader?.response.readingOrder : undefined

  function focusFile(file: string) {
    const match = nodes.find((node) => node.file === file)
    if (match) setSelectedId(match.id)
  }

  function onDragStart(event: ReactPointerEvent) {
    event.preventDefault()
    const onMove = (move: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = rect.right - move.clientX
      setPanelWidth(Math.min(640, Math.max(340, width)))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const selectedNode = nodes.find((node) => node.id === selectedId) ?? null
  const active = results[mode]

  return (
    <div
      ref={containerRef}
      className="flex h-[calc(100svh-3.5rem)] flex-col overflow-hidden lg:flex-row"
    >
      <div className="relative h-[45svh] shrink-0 lg:h-auto lg:flex-1">
        {loading ? (
          <div className="grid h-full place-items-center bg-canvas text-slate-400">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="grid h-full place-items-center bg-canvas p-6 text-center">
            <div className="space-y-3">
              <p className="text-sm text-slate-300">{error}</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </div>
        ) : graph ? (
          <GraphView
            graph={graph}
            nodes={nodes}
            clusters={clusters}
            edges={edges}
            selectedId={selectedId}
            onSelect={setSelectedId}
            highlightIds={highlightIds}
            nodeStatus={nodeStatus}
            readingOrder={readingOrder}
          />
        ) : null}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={onDragStart}
        className="hidden w-1.5 cursor-col-resize items-center justify-center bg-border/60 hover:bg-brand/40 lg:flex"
      />

      <aside
        style={{ '--panel-w': `${panelWidth}px` } as CSSProperties}
        className="flex min-h-0 w-full flex-1 flex-col border-t border-border bg-surface lg:w-[var(--panel-w)] lg:flex-none lg:shrink-0 lg:border-t-0 lg:border-l"
      >
        <div className="shrink-0 border-b border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Dashboard
            </Link>
            {repo ? (
              <Badge variant="outline" className="font-mono">
                {REPO_STATUS_LABEL[status?.stage === 'done' ? 'ready' : mapRepoStatus(repo.status)]}
              </Badge>
            ) : null}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="glow-sm grid size-9 place-items-center rounded-lg bg-canvas text-white">
              <GitBranch className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {repo ? `${repo.owner}/${repo.name}` : 'Loading…'}
              </p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {repo?.url}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <CommandBar mode={mode} onRun={(query) => void runQuery(mode, query)} />
          </div>

          <div className="mt-3">
            <ModeTabs value={mode} onChange={setMode} />
          </div>
        </div>

        <div className="shrink-0 border-b border-border p-4">
          <StageTimeline status={status} demo={statusDemo} />
        </div>

        <div className={cn('flex-1 overflow-auto')}>
          {selectedNode ? (
            <div className="border-b border-border p-4">
              <NodeInspector
                node={selectedNode}
                neighborCount={adjacency.get(selectedNode.id)?.size ?? 0}
                onClear={() => setSelectedId(null)}
              />
            </div>
          ) : null}

          <ModePanel
            mode={mode}
            response={active?.response}
            query={queries[mode]}
            demo={active?.demo}
            loading={loadingMode === mode}
            nodes={nodes}
            repoId={repoId}
            selectedId={selectedId}
            onSelectNode={setSelectedId}
            onSelectFile={focusFile}
            onPlanUploaded={() => void runQuery('plan', queries.plan ?? DEFAULT_QUERY.plan)}
          />
        </div>
      </aside>
    </div>
  )
}
