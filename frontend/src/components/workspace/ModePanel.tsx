import { ContextPanel } from '@/components/workspace/ContextPanel'
import { PlanPanel } from '@/components/workspace/PlanPanel'
import { ReaderPanel } from '@/components/workspace/ReaderPanel'
import type { WorkspaceMode } from '@/components/workspace/ModeTabs'
import type { PositionedNode } from '@/lib/graphLayout'
import type { QueryResponse } from '@/types'

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
}) {
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
