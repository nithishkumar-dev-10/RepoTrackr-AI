/** Indexing pipeline progress (legacy demo timeline types). */

export type IndexStage = 'clone' | 'parse' | 'graph' | 'index' | 'done' | 'error'

export interface IndexStatus {
  stage: IndexStage
  /** 0..100 */
  progress: number
}

/** Ordered stages used to render the legacy demo timeline. */
export const INDEX_STAGES: readonly IndexStage[] = [
  'clone',
  'parse',
  'graph',
  'index',
] as const

/** Real Part 2 wire types from backend/app/schemas/indexing.py. */

export interface IndexStartOut {
  status: string
  message: string
}

export interface IndexRunStatus {
  status: string
  commit_sha: string | null
  error_message: string | null
}

export interface IndexSymbol {
  name: string
  kind: string
  file: string
  line_start: number
  line_end: number
  signature?: string | null
  docstring?: string | null
  parent?: string | null
}

export interface IndexSummary {
  commit_sha: string
  file_tree: string[]
  symbol_counts: Record<string, number>
  total_symbols: number
  modules: string[]
  entry_points: string[]
  symbols: IndexSymbol[]
  files_indexed: number
  files_parsed: number
  files_cached: number
  files_skipped: string[]
  graph_node_count: number
  graph_edge_count: number
  lines_of_code: number
  index_seconds: number
  seconds_per_10k_loc: number
}

/** Ordered real statuses used by the repo badge and timeline. */
export const INDEX_RUN_STAGES = [
  'queued',
  'cloning',
  'indexing',
  'ready',
] as const
