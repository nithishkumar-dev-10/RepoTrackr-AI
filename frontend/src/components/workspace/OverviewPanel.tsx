import {
  Boxes,
  Code2,
  FileCode2,
  Files,
  FolderTree,
  GitBranch,
  Loader2,
  Rocket,
  RotateCcw,
  Timer,
} from 'lucide-react'

import {
  isRepoStatusActive,
  mapRepoStatus,
  REPO_STATUS_LABEL,
} from '@/api/repos'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AccentIcon, Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Accent } from '@/lib/designTokens'
import { NODE_KIND_META, type DisplayNodeKind } from '@/lib/graphVisuals'
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
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-tint text-brand">
          {icon}
        </div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

function kindMeta(kind: string) {
  return NODE_KIND_META[kind as DisplayNodeKind]
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

  const stats: Array<{
    label: string
    value: number
    accent: Accent
    icon: typeof Boxes
  }> = [
    { label: 'Symbols', value: summary.total_symbols, accent: 'violet', icon: Boxes },
    { label: 'Files indexed', value: summary.files_indexed, accent: 'teal', icon: Files },
    { label: 'Modules', value: summary.modules.length, accent: 'amber', icon: FolderTree },
    { label: 'Entry points', value: summary.entry_points.length, accent: 'rose', icon: Rocket },
    { label: 'Lines of code', value: summary.lines_of_code, accent: 'emerald', icon: Code2 },
    { label: 'Graph edges', value: summary.graph_edge_count, accent: 'brand', icon: GitBranch },
  ]

  return (
    <div className="px-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 py-4">
        <div>
          <p className="text-sm font-medium text-foreground">Index overview</p>
          <p className="font-mono text-xs text-muted-foreground">
            {summary.commit_sha}
          </p>
        </div>
        <Badge variant="brand" className="font-mono">
          <Timer className="size-3" />
          {summary.index_seconds.toLocaleString()}s
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stats.map(({ label, value, accent, icon: Icon }) => (
          <Card key={label} accent={accent} className="p-3 hover:shadow-card-hover">
            <div className="flex items-center gap-2">
              <AccentIcon accent={accent} className="size-8 rounded-lg">
                <Icon className="size-4" />
              </AccentIcon>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold leading-tight text-foreground">
                  {value.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Section title="Symbol counts">
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.symbol_counts).length === 0 ? (
            <p className="text-xs text-muted-foreground">None</p>
          ) : (
            Object.entries(summary.symbol_counts).map(([kind, count]) => {
              const meta = kindMeta(kind)
              return (
                <Badge
                  key={kind}
                  variant="outline"
                  className="font-mono"
                  style={
                    meta
                      ? { color: meta.ink, backgroundColor: meta.tint, borderColor: 'transparent' }
                      : undefined
                  }
                >
                  {kind}: {count}
                </Badge>
              )
            })
          )}
        </div>
      </Section>

      <Section title="Modules">
        {summary.modules.length === 0 ? (
          <p className="text-xs text-muted-foreground">None detected</p>
        ) : (
          <div className="rounded-xl border border-amber/25 bg-amber-tint/60 p-3">
            <ol className="space-y-1 font-mono text-xs text-foreground/80">
              {summary.modules.map((module, index) => (
                <li key={module} className="flex gap-2">
                  <span className="shrink-0 font-semibold text-amber">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="break-all">{module}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Section>

      <Section title="Entry points">
        {summary.entry_points.length === 0 ? (
          <p className="text-xs text-muted-foreground">None detected</p>
        ) : (
          <ul className="space-y-1 rounded-xl border border-rose/25 bg-rose-tint/60 p-3 font-mono text-xs text-foreground/80">
            {summary.entry_points.map((entry) => (
              <li key={entry} className="flex gap-2 break-all">
                <Rocket className="mt-0.5 size-3 shrink-0 text-rose" />
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
                <FileCode2 className="mr-1.5 inline size-3 text-teal" />
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
                className="rounded-xl border border-l-2 border-border bg-background p-3"
                style={{ borderLeftColor: kindMeta(symbol.kind)?.ink }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm text-foreground">
                    {symbol.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="font-mono text-xs"
                    style={
                      kindMeta(symbol.kind)
                        ? {
                            color: kindMeta(symbol.kind).ink,
                            backgroundColor: kindMeta(symbol.kind).tint,
                            borderColor: 'transparent',
                          }
                        : undefined
                    }
                  >
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
