/** Repository wire types. */

/** Raw status values the backend stores on a repo. */
export type RepoStatus =
  | 'added'
  | 'queued'
  | 'cloning'
  | 'indexing'
  | 'ready'
  | 'failed'
  | 'indexed'
  | 'error'

/** Normalized status used for the UI status chip. */
export type UiRepoStatus =
  | 'not_indexed'
  | 'queued'
  | 'cloning'
  | 'indexing'
  | 'ready'
  | 'failed'

export interface Repo {
  id: number
  url: string
  owner: string
  name: string
  status: string
  commit_sha?: string | null
  error_message?: string | null
  created_at: string
}

export interface RepoList {
  repos: Repo[]
}

export interface RepoCreate {
  url: string
}
