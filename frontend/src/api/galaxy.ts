import { ApiError, request } from '@/api/client'
import {
  detectIntent,
  mockGraph,
  mockPlanResponse,
  mockReaderResponse,
  mockResponseForIntent,
  nextMockIndexStatus,
} from '@/mock'
import type {
  Graph,
  IndexStatus,
  QueryIntent,
  QueryMode,
  QueryResponse,
} from '@/types'

/**
 * The single boundary for endpoints the backend still returns 501 for
 * (index, index status/summary, plan, reader, context, query, agent trace,
 * evals). Every call hits the real FastAPI route first; on 501 (or any
 * failure that is not an auth error) it falls back to typed mock data.
 * `demo: true` means the value is mock data and the UI shows a "Demo data" badge.
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

/** POST /repos/{id}/index */
export function startIndex(repoId: number): Promise<DemoData<StatusOnly>> {
  return withFallback(
    () => request<StatusOnly>(`/repos/${repoId}/index`, { method: 'POST' }),
    () => ({ status: 'not_implemented' }),
  )
}

/** GET /repos/{id}/index/status */
export function getIndexStatus(repoId: number): Promise<DemoData<IndexStatus>> {
  return withFallback(
    () => request<IndexStatus>(`/repos/${repoId}/index/status`),
    () => nextMockIndexStatus(),
  )
}

/** GET /repos/{id}/index/summary */
export function getIndexSummary(repoId: number): Promise<DemoData<StatusOnly>> {
  return withFallback(
    () => request<StatusOnly>(`/repos/${repoId}/index/summary`),
    () => ({ status: 'not_implemented' }),
  )
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
