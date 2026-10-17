import type { IndexStage, IndexStatus } from '@/types'

/** Stateful mock so polling shows the pipeline advancing each tick. */
let progress = 0

function stageFor(p: number): IndexStage {
  if (p >= 100) return 'done'
  if (p >= 70) return 'index'
  if (p >= 45) return 'graph'
  if (p >= 20) return 'parse'
  return 'clone'
}

export function nextMockIndexStatus(): IndexStatus {
  progress = Math.min(100, progress + 9 + Math.random() * 12)
  return { stage: stageFor(progress), progress: Math.round(progress) }
}

export function resetMockIndexStatus(): void {
  progress = 0
}
