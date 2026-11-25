import { ContextPanel } from '@/components/workspace/ContextPanel'
import { OverviewPanel } from '@/components/workspace/OverviewPanel'
import { PlanPanel } from '@/components/workspace/PlanPanel'
import { ReaderPanel } from '@/components/workspace/ReaderPanel'
import type { WorkspaceMode } from '@/components/workspace/ModeTabs'
import type { PositionedNode } from '@/lib/graphLayout'
import type { IndexRunStatus, IndexSummary, QueryResponse } from '@/types'

export function ModePanel({
  mode,
  response,
  query,
  demo,
  loading,
  nodes,
  repoId,
  selectedId,
  onSelectNode,
  onSelectFile,
  onPlanUploaded,
  indexStatus,
  indexSummary,
  indexSummaryLoading,
  indexSummaryError,
  onRetryIndex,
}: {
  mode: WorkspaceMode
  response?: QueryResponse
  query?: string
  demo?: boolean
  loading?: boolean
  nodes: PositionedNode[]
  repoId: number
  selectedId?: string | null
  onSelectNode?: (id: string) => void
  onSelectFile?: (file: string) => void
  onPlanUploaded?: () => void
  indexStatus: IndexRunStatus | null
  indexSummary: IndexSummary | null
  indexSummaryLoading: boolean
  indexSummaryError: string
  onRetryIndex: () => void
}) {
  if (mode === 'overview') {
    return (
      <OverviewPanel
        status={indexStatus}
        summary={indexSummary}
        loading={indexSummaryLoading}
        error={indexSummaryError}
        onRetry={onRetryIndex}
      />
    )
  }

  if (mode === 'plan') {
    return (
      <PlanPanel
        response={response}
        query={query}
        demo={demo}
        loading={loading}
        repoId={repoId}
        onUploaded={onPlanUploaded}
        onSelectFile={onSelectFile}
      />
    )
  }

  if (mode === 'context') {
    return (
      <ContextPanel
        response={response}
        query={query}
        demo={demo}
        loading={loading}
        nodes={nodes}
        onSelectNode={onSelectNode}
      />
    )
  }

  return (
    <ReaderPanel
      response={response}
      query={query}
      demo={demo}
      loading={loading}
      nodes={nodes}
      selectedId={selectedId}
      onSelectNode={onSelectNode}
      onSelectFile={onSelectFile}
    />
  )
}
