/** Indexing pipeline progress. */

export type IndexStage = 'clone' | 'parse' | 'graph' | 'index' | 'done' | 'error'

export interface IndexStatus {
  stage: IndexStage
  /** 0..100 */
  progress: number
}

/** Ordered stages used to render the progress timeline. */
export const INDEX_STAGES: readonly IndexStage[] = [
  'clone',
  'parse',
  'graph',
  'index',
] as const
