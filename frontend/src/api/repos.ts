import { request } from '@/api/client'
import type { MessageResponse } from '@/types/auth'
import type { Repo, RepoList, UiRepoStatus } from '@/types/repo'

/** Real repository endpoints from backend/app/features/repos/router.py. */

/** GET /repos — the current user's repos, newest first. */
export function listRepos(): Promise<RepoList> {
  return request<RepoList>('/repos')
}

/** POST /repos — add a GitHub repo by URL. Returns the created repo (201). */
export function createRepo(url: string): Promise<Repo> {
  return request<Repo>('/repos', { method: 'POST', body: { url } })
}

/** GET /repos/{id} — a single owned repo. */
export function getRepo(repoId: number): Promise<Repo> {
  return request<Repo>(`/repos/${repoId}`)
}

/** DELETE /repos/{id} — remove a repo. */
export function deleteRepo(repoId: number): Promise<MessageResponse> {
  return request<MessageResponse>(`/repos/${repoId}`, { method: 'DELETE' })
}

/**
 * Map the backend's free-form `status` string to the three UI states.
 * Backend stores "added" on creation; "indexing"/"indexed"/"error" are
 * reserved for the indexing pipeline, so anything unknown reads as not indexed.
 */
export function mapRepoStatus(status: string): UiRepoStatus {
  switch (status) {
    case 'indexed':
      return 'ready'
    case 'indexing':
      return 'indexing'
    case 'error':
      return 'error'
    default:
      return 'not_indexed'
  }
}

/** Human labels for the status chip. */
export const REPO_STATUS_LABEL: Record<UiRepoStatus, string> = {
  not_indexed: 'Not indexed',
  indexing: 'Indexing',
  ready: 'Ready',
  error: 'Error',
}
