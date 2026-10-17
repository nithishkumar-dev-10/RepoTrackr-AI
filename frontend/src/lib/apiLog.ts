import { useSyncExternalStore } from 'react'

/** One recorded HTTP call made through the API client. */
export interface ApiLogEntry {
  id: number
  method: string
  path: string
  /** HTTP status, or 0 for a network failure. */
  status: number
  ok: boolean
  ms: number
  at: number
}

const MAX_ENTRIES = 100

let entries: ApiLogEntry[] = []
let seq = 0
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function addApiLog(entry: Omit<ApiLogEntry, 'id' | 'at'>) {
  seq += 1
  entries = [{ ...entry, id: seq, at: Date.now() }, ...entries].slice(0, MAX_ENTRIES)
  emit()
}

export function clearApiLog() {
  entries = []
  emit()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): ApiLogEntry[] {
  return entries
}

/** Live list of recent API activity for the Developer inspector. */
export function useApiLog(): ApiLogEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
