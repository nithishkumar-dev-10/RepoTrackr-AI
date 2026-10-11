/** Query routing, answers, citations and per-mode payloads. */

export type QueryIntent = 'reader' | 'plan' | 'context_pack'

export type QueryMode = QueryIntent | 'auto'

export interface Citation {
  file: string
  line: number
  snippet: string
}

export type PlanItemStatus = 'done' | 'partial' | 'missing' | 'unknown'

export interface PlanItem {
  id: string
  text: string
  status: PlanItemStatus
  evidence: Citation[]
}

export interface PackedContext {
  markdown: string
  prompt: string
  tokenBudget: number
  tokensUsed: number
  tiers: {
    /** Node ids packed with full source body. */
    full: string[]
    /** Node ids packed as signature only. */
    signature: string[]
  }
}

export interface QueryResponse {
  intent: QueryIntent
  answer: string
  citations: Citation[]
  /** Node ids in reading order (reader intent). */
  readingOrder?: string[]
  /** Plan items with status + evidence (plan intent). */
  planItems?: PlanItem[]
  /** Packed context + prompt (context_pack intent). */
  packed?: PackedContext
}
