import { Boxes, FolderTree, Loader2, RotateCcw } from 'lucide-react'

import {
  isRepoStatusActive,
  mapRepoStatus,
  REPO_STATUS_LABEL,
} from '@/api/repos'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { IndexRunStatus, IndexSummary } from '@/types'

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-b border-border py-4 last:border-b-0">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </section>
  )
}

function StateBlock({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode
  title: string
  detail: string
}) {
  return (
    <div className="grid min-h-64 place-items-center px-6 text-center">
      <div className="max-w-sm space-y-2">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-accent text-brand">
          {icon}
        </div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

export function OverviewPanel({
  status,
  summary,
  loading,
  error,
  onRetry,
}: {
  status: IndexRunStatus | null
  summary: IndexSummary | null
  loading: boolean
  error: string
  onRetry: () => void
}) {
  const state = mapRepoStatus(status?.status ?? 'added')

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span className="text-xs">{error}</span>
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCcw className="size-3.5" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (state !== 'ready') {
    const active = isRepoStatusActive(status?.status ?? 'added')
    return (
      <StateBlock
        icon={active ? <Loader2 className="size-5 animate-spin" /> : <Boxes className="size-5" />}
        title={`Overview — ${REPO_STATUS_LABEL[state]}`}
        detail={
          state === 'failed'
            ? 'Indexing failed. Fix the repo URL or retry from the timeline below.'
            : 'Symbols appear here only after indexing finishes with status ready.'
        }
      />
    )
  }

  if (loading) {
    return (
      <StateBlock
        icon={<Loader2 className="size-5 animate-spin" />}
        title="Loading overview"
        detail="Reading the stored index summary from the backend."
      />
    )
  }

  if (!summary) {
    return (
      <StateBlock
        icon={<FolderTree className="size-5" />}
        title="No overview yet"
        detail="This repo is ready but has no stored summary. Re-run indexing to generate one."
      />
    )
  }

  return (
    <div className="px-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 py-4">
        <div>
          <p className="text-sm font-medium text-foreground">Index overview</p>
          <p className="font-mono text-xs text-muted-foreground">
            {summary.commit_sha}
          </p>
        </div>
        <Badge variant="outline" className="font-mono">
          {summary.total_symbols} symbols
        </Badge>
      </div>

      <Section title="Symbol counts">
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.symbol_counts).length === 0 ? (
            <p className="text-xs text-muted-foreground">None</p>
          ) : (
            Object.entries(summary.symbol_counts).map(([kind, count]) => (
              <Badge key={kind} variant="outline" className="font-mono">
                {kind}: {count}
              </Badge>
            ))
          )}
        </div>
      </Section>

      <Section title="Modules">
        {summary.modules.length === 0 ? (
          <p className="text-xs text-muted-foreground">None detected</p>
        ) : (
          <ol className="space-y-1 font-mono text-xs text-muted-foreground">
            {summary.modules.map((module, index) => (
              <li key={module} className="flex gap-2">
                <span className="text-brand">{String(index + 1).padStart(2, '0')}</span>
                <span className="break-all">{module}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Entry points">
        {summary.entry_points.length === 0 ? (
          <p className="text-xs text-muted-foreground">None detected</p>
        ) : (
          <ul className="space-y-1 font-mono text-xs text-muted-foreground">
            {summary.entry_points.map((entry) => (
              <li key={entry} className="break-all">
                {entry}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="File tree">
        {summary.file_tree.length === 0 ? (
          <p className="text-xs text-muted-foreground">No files indexed</p>
        ) : (
          <ul className="max-h-56 space-y-1 overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-xs text-muted-foreground">
            {summary.file_tree.map((file) => (
              <li key={file} className="break-all">
                {file}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Symbols">
        {summary.symbols.length === 0 ? (
          <p className="text-xs text-muted-foreground">No symbols indexed</p>
        ) : (
          <ul className="space-y-2">
            {summary.symbols.map((symbol, index) => (
              <li
                key={`${symbol.file}:${symbol.line_start}:${symbol.name}:${index}`}
                className="rounded-xl border border-border bg-background p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm text-foreground">
                    {symbol.name}
                  </span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {symbol.kind}
                  </Badge>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {symbol.file}:{symbol.line_start}–{symbol.line_end}
                </p>
                {symbol.signature ? (
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                    {symbol.signature}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {summary.files_skipped.length > 0 ? (
        <Section title="Skipped files">
          <p className="font-mono text-xs text-muted-foreground">
            {summary.files_skipped.join(', ')}
          </p>
        </Section>
      ) : null}
    </div>
  )
}
