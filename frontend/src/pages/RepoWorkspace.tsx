import { ArrowLeft, Boxes, GitBranch, Loader2 } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ApiError } from '@/api/client'
import {
  buildContext,
  getGraph,
  getIndexStatus,
  getIndexSummary,
  queryRepo,
  startIndex,
} from '@/api/galaxy'
import {
  getRepo,
  isRepoStatusActive,
  mapRepoStatus,
  REPO_STATUS_LABEL,
} from '@/api/repos'
import { CommandBar } from '@/components/workspace/CommandBar'
import { GraphView } from '@/components/workspace/GraphView'
import { ModePanel } from '@/components/workspace/ModePanel'
import { ModeTabs, type WorkspaceMode } from '@/components/workspace/ModeTabs'
import { NodeInspector } from '@/components/workspace/NodeInspector'
import { PanelErrorBoundary } from '@/components/workspace/PanelErrorBoundary'
import { StageTimeline } from '@/components/workspace/StageTimeline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { buildAdjacency, buildCallCounts, layoutGraph } from '@/lib/graphLayout'
import { buildSymbolKindMap } from '@/lib/graphVisuals'
import { cn } from '@/lib/utils'
import type {
  Graph,
  IndexRunStatus,
  IndexSummary,
  PlanItemStatus,
  QueryResponse,
  Repo,
} from '@/types'

const DEFAULT_QUERY: Record<WorkspaceMode, string> = {
  overview: '',
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
  return <RepoWorkspaceView key={idParam} repoId={Number(idParam)} />
}

function RepoWorkspaceView({ repoId }: { repoId: number }) {
  const { toast } = useToast()
  const { status: authStatus } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)

  const [repo, setRepo] = useState<Repo | null>(null)
  const [graph, setGraph] = useState<Graph | null>(null)
  const [graphLoading, setGraphLoading] = useState(false)
  const [graphError, setGraphError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [indexStatus, setIndexStatus] = useState<IndexRunStatus | null>(null)
  const [statusError, setStatusError] = useState('')
  const [summary, setSummary] = useState<IndexSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState('')
  const [startPending, setStartPending] = useState(false)

  const [mode, setMode] = useState<WorkspaceMode>('overview')
  const [results, setResults] = useState<Partial<Record<WorkspaceMode, ModeResult>>>({})
  const [queries, setQueries] = useState<Partial<Record<WorkspaceMode, string>>>({})
  const [loadingMode, setLoadingMode] = useState<WorkspaceMode | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelWidth, setPanelWidth] = useState(440)

  const fetchSummary = useCallback(async (targetRepoId: number) => {
    setSummaryLoading(true)
    setSummaryError('')
    try {
      const data = await getIndexSummary(targetRepoId)
      setSummary(data)
    } catch (err) {
      setSummary(null)
      setSummaryError(err instanceof Error ? err.message : 'Could not load overview.')
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  const fetchGraph = useCallback(
    async (targetRepoId: number, alive: () => boolean = () => true) => {
      setGraphLoading(true)
      setGraphError('')
      try {
        const data = await getGraph(targetRepoId)
        if (!alive()) return
        setGraph(data.data)
      } catch (err) {
        if (!alive()) return
        setGraph(null)
        setGraphError(err instanceof Error ? err.message : 'Could not load the graph.')
      } finally {
        if (alive()) setGraphLoading(false)
      }
    },
    [],
  )

  const effectiveStatus = useMemo<IndexRunStatus | null>(() => {
    if (indexStatus) return indexStatus
    if (!repo) return null
    return {
      status: repo.status,
      commit_sha: repo.commit_sha ?? null,
      error_message: repo.error_message ?? null,
    }
  }, [indexStatus, repo])

  const currentRepo = useMemo(() => {
    if (!repo || !effectiveStatus) return repo
    return {
      ...repo,
      status: effectiveStatus.status,
      commit_sha: effectiveStatus.commit_sha ?? repo.commit_sha,
      error_message: effectiveStatus.error_message,
    }
  }, [repo, effectiveStatus])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const loadedRepo = await getRepo(repoId)
        if (cancelled) return
        setRepo(loadedRepo)
        void fetchGraph(loadedRepo.id, () => !cancelled)
        if (loadedRepo.status === 'ready') void fetchSummary(loadedRepo.id)
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
  }, [repoId, reloadKey, fetchSummary, fetchGraph])

  // Real status poll: every 2.5s only while queued/cloning/indexing.
  // The interval is always cleared on unmount or on a terminal status.
  useEffect(() => {
    const status = effectiveStatus?.status ?? repo?.status
    if (
      authStatus !== 'authenticated' ||
      !repo ||
      !status ||
      !isRepoStatusActive(status)
    ) {
      return
    }

    let stopped = false
    let timer = 0
    const tick = async () => {
      try {
        const data = await getIndexStatus(repo.id)
        if (stopped) return
        setIndexStatus(data)
        setStatusError('')
        if (data.status === 'ready' || data.status === 'failed') {
          window.clearInterval(timer)
          if (data.status === 'ready') {
            void fetchSummary(repo.id)
            void fetchGraph(repo.id)
          }
        }
      } catch (err) {
        if (!stopped) {
          setStatusError(err instanceof Error ? err.message : 'Could not read status.')
          window.clearInterval(timer)
        }
      }
    }

    timer = window.setInterval(() => void tick(), 2500)
    void tick()
    return () => {
      stopped = true
      if (timer) window.clearInterval(timer)
    }
  }, [authStatus, repo, effectiveStatus?.status, fetchSummary, fetchGraph])

  const symbolKinds = useMemo(() => buildSymbolKindMap(summary?.symbols), [summary])
  const layout = useMemo(
    () => (graph ? layoutGraph(graph, { symbolKinds }) : null),
    [graph, symbolKinds],
  )
  const nodes = useMemo(() => layout?.nodes ?? [], [layout])
  const clusters = useMemo(() => layout?.clusters ?? [], [layout])
  const edges = useMemo(() => graph?.edges ?? [], [graph])
  const adjacency = useMemo(
    () => (graph ? buildAdjacency(graph) : new Map<string, Set<string>>()),
    [graph],
  )
  const callCounts = useMemo(
    () => (graph ? buildCallCounts(graph) : new Map<string, { callers: number; callees: number }>()),
    [graph],
  )

  const handleStartIndex = useCallback(async () => {
    if (!currentRepo) return
    setStartPending(true)
    try {
      const result = await startIndex(currentRepo.id)
      setIndexStatus({ status: result.status, commit_sha: null, error_message: null })
      setStatusError('')
      setSummary(null)
      toast({
        title: 'Indexing queued',
        description: `${currentRepo.owner}/${currentRepo.name}`,
        variant: 'info',
      })
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast({
          title: 'Already indexing',
          description: err.message,
          variant: 'info',
        })
        try {
          const current = await getIndexStatus(currentRepo.id)
          setIndexStatus(current)
        } catch {
          // Keep the status already shown; the badge will refresh on reload.
        }
      } else {
        toast({
          title: 'Could not start indexing',
          description: err instanceof Error ? err.message : undefined,
          variant: 'error',
        })
      }
    } finally {
      setStartPending(false)
    }
  }, [currentRepo, toast])

  const runQuery = useCallback(
    async (target: WorkspaceMode, query: string) => {
      if (target === 'overview') return
      setLoadingMode(target)
      try {
        const result =
          target === 'context'
            ? await buildContext(repoId, query)
            : await queryRepo(repoId, query, target)
        setResults((prev) => ({
          ...prev,
          [target]: { response: result.data, demo: result.demo },
        }))
        setQueries((prev) => ({ ...prev, [target]: query }))
      } catch {
        toast({ title: 'Query failed', variant: 'error' })
      } finally {
        setLoadingMode(null)
      }
    },
    [repoId, toast],
  )

  function selectMode(next: WorkspaceMode) {
    setMode(next)
    if (next === 'overview' || !repo || results[next]) return
    void runQuery(next, queries[next] ?? DEFAULT_QUERY[next])
  }

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
  const badgeStatus = mapRepoStatus(effectiveStatus?.status ?? repo?.status ?? 'added')

  return (
    <div
      ref={containerRef}
      className="flex min-h-[calc(100svh-3.5rem)] flex-col lg:h-[calc(100svh-3.5rem)] lg:flex-row lg:overflow-hidden"
    >
      <div className="relative h-[50svh] min-h-[300px] shrink-0 lg:h-auto lg:min-h-0 lg:flex-1">
        {loading || graphLoading ? (
          <div className="grid h-full place-items-center bg-canvas text-slate-400">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="grid h-full place-items-center bg-canvas p-6 text-center">
            <div className="space-y-3">
              <p className="text-sm text-slate-300">{error}</p>
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLoading(true)
                    setError('')
                    setGraph(null)
                    setGraphError('')
                    setReloadKey((key) => key + 1)
                  }}
                >
                  Retry
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/dashboard">Back to dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        ) : graphError ? (
          <div className="grid h-full place-items-center bg-canvas p-6 text-center">
            <div className="space-y-3">
              <p className="text-sm text-slate-300">{graphError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchGraph(repoId)}
              >
                Retry graph
              </Button>
            </div>
          </div>
        ) : graph && graph.nodes.length > 0 ? (
          <>
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
              truncated={graph.truncated}
            />
          </>
        ) : (
          <div className="grid h-full place-items-center bg-canvas p-6 text-center">
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                No graph yet. Indexing must finish before the code graph is available.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchGraph(repoId)}
              >
                Retry graph
              </Button>
            </div>
          </div>
        )}
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
            <div className="flex items-center gap-2">
              {currentRepo?.status === 'added' ? (
                <Button
                  variant="brand"
                  size="sm"
                  onClick={() => void handleStartIndex()}
                  disabled={startPending}
                >
                  {startPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Boxes className="size-4" />
                  )}
                  Start indexing
                </Button>
              ) : null}
              {currentRepo ? (
                <Badge variant="outline" className="font-mono">
                  {REPO_STATUS_LABEL[badgeStatus]}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="glow-sm grid size-9 place-items-center rounded-lg bg-canvas text-white">
              <GitBranch className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {currentRepo ? `${currentRepo.owner}/${currentRepo.name}` : 'Loading…'}
              </p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {currentRepo?.url}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <CommandBar mode={mode} onRun={(query) => void runQuery(mode, query)} />
          </div>

          <div className="mt-3">
            <ModeTabs value={mode} onChange={selectMode} />
          </div>
        </div>

        <div className="shrink-0 border-b border-border p-4">
          <StageTimeline
            status={effectiveStatus}
            onRetry={() => void handleStartIndex()}
            retrying={startPending}
          />
        </div>

        <div className={cn('flex-1 overflow-auto')}>
          {selectedNode ? (
            <div className="border-b border-border p-4">
              <NodeInspector
                node={selectedNode}
                neighborCount={adjacency.get(selectedNode.id)?.size ?? 0}
                callers={callCounts.get(selectedNode.id)?.callers ?? 0}
                callees={callCounts.get(selectedNode.id)?.callees ?? 0}
                onClear={() => setSelectedId(null)}
              />
            </div>
          ) : null}

          <PanelErrorBoundary key={mode}>
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
              indexStatus={effectiveStatus}
              indexSummary={summary}
              indexSummaryLoading={summaryLoading}
              indexSummaryError={summaryError || statusError}
              onRetryIndex={() => void handleStartIndex()}
            />
          </PanelErrorBoundary>
        </div>
      </aside>
    </div>
  )
}
