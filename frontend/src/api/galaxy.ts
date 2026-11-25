import { ApiError, request } from '@/api/client'
import {
  detectIntent,
  mockGraph,
  mockPlanResponse,
  mockReaderResponse,
  mockResponseForIntent,
} from '@/mock'
import type {
  Graph,
  IndexRunStatus,
  IndexStartOut,
  IndexSummary,
  QueryIntent,
  QueryMode,
  QueryResponse,
} from '@/types'

/**
 * The boundary for endpoints the backend still returns 501 for (plan, reader,
 * context, query, agent trace, evals). Those calls hit the real FastAPI route
 * first and fall back to typed mock data, with `demo: true` so the UI labels it.
 * The Part 2 index endpoints are live and never fall back to mock data.
 *
 * Static analysis decides what is true. AI only retrieves and explains.
 */

export interface DemoData<T> {
  data: T
  /** True when `data` came from local mock data rather than the backend. */
  demo: boolean
}

export interface StatusOnly {
  status: string
}

const AUTH_STATUSES = new Set([401, 403])

async function withFallback<T>(
  call: () => Promise<T>,
  fallback: () => T,
): Promise<DemoData<T>> {
  try {
    return { data: await call(), demo: false }
  } catch (error) {
    // Never mask auth/permission errors behind demo data — the caller needs
    // to react (refresh, redirect to /login).
    if (error instanceof ApiError && AUTH_STATUSES.has(error.status)) throw error
    return { data: fallback(), demo: true }
  }
}

function resolveIntent(query: string, mode: QueryMode): QueryIntent {
  return mode === 'auto' ? detectIntent(query) : mode
}

/** No dedicated graph route exists yet; this is always demo data. */
export function getGraph(_repoId: number): Promise<DemoData<Graph>> {
  return Promise.resolve({ data: mockGraph, demo: true })
}

/**
 * Synchronous demo data for the landing page (no network, no repo).
 * Keeps every mock behind this module.
 */
export function demoResponseForQuery(query: string): QueryResponse {
  return mockResponseForIntent(detectIntent(query))
}

export function demoGraph(): Graph {
  return mockGraph
}

/** POST /repos/{id}/index — real 202 response, or 409 while already running. */
export function startIndex(repoId: number): Promise<IndexStartOut> {
  return request<IndexStartOut>(`/repos/${repoId}/index`, { method: 'POST' })
}

/** GET /repos/{id}/index/status — real durable status from the Repo row. */
export function getIndexStatus(repoId: number): Promise<IndexRunStatus> {
  return request<IndexRunStatus>(`/repos/${repoId}/index/status`)
}

/** GET /repos/{id}/index/summary — real IndexSummaryOut, 409 before ready. */
export function getIndexSummary(repoId: number): Promise<IndexSummary> {
  return request<IndexSummary>(`/repos/${repoId}/index/summary`)
}

/** GET /repos/{id}/reader */
export function getReader(repoId: number): Promise<DemoData<QueryResponse>> {
  return withFallback(
    () => request<QueryResponse>(`/repos/${repoId}/reader`),
    () => mockReaderResponse,
  )
}

/** GET /repos/{id}/plan */
export function getPlan(repoId: number): Promise<DemoData<QueryResponse>> {
  return withFallback(
    () => request<QueryResponse>(`/repos/${repoId}/plan`),
    () => mockPlanResponse,
  )
}

/** POST /repos/{id}/plan (multipart upload) */
export function uploadPlan(
  repoId: number,
  file: File,
): Promise<DemoData<StatusOnly>> {
  return withFallback(
    () => {
      const form = new FormData()
      form.append('file', file)
      return request<StatusOnly>(`/repos/${repoId}/plan`, {
        method: 'POST',
        form,
      })
    },
    () => ({ status: 'not_implemented' }),
  )
}

/** POST /repos/{id}/context */
export function buildContext(
  repoId: number,
  query: string,
  mode: QueryMode = 'auto',
): Promise<DemoData<QueryResponse>> {
  return withFallback(
    () =>
      request<QueryResponse>(`/repos/${repoId}/context`, {
        method: 'POST',
        body: { query, mode },
      }),
    () => mockResponseForIntent(resolveIntent(query, 'context_pack')),
  )
}

/** POST /repos/{id}/query */
export function queryRepo(
  repoId: number,
  query: string,
  mode: QueryMode = 'auto',
): Promise<DemoData<QueryResponse>> {
  return withFallback(
    () =>
      request<QueryResponse>(`/repos/${repoId}/query`, {
        method: 'POST',
        body: { query, mode },
      }),
    () => mockResponseForIntent(resolveIntent(query, mode)),
  )
}

/** GET /repos/{id}/agent/trace */
export function getAgentTrace(repoId: number): Promise<DemoData<StatusOnly>> {
  return withFallback(
    () => request<StatusOnly>(`/repos/${repoId}/agent/trace`),
    () => ({ status: 'not_implemented' }),
  )
}

/** GET /evals */
export function getEvals(): Promise<DemoData<StatusOnly>> {
  return withFallback(
    () => request<StatusOnly>('/evals'),
    () => ({ status: 'not_implemented' }),
  )
}
