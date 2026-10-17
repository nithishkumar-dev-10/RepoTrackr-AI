/** Repository wire types. */

/** Raw status values the backend stores on a repo. */
export type RepoStatus = 'added' | 'indexing' | 'indexed' | 'error'

/** Normalized status used for the UI status chip. */
export type UiRepoStatus = 'not_indexed' | 'indexing' | 'ready' | 'error'

export interface Repo {
  id: number
  url: string
  owner: string
  name: string
  status: string
  created_at: string
}

export interface RepoList {
  repos: Repo[]
}

export interface RepoCreate {
  url: string
}
