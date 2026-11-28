import { hues } from '@/lib/designTokens'
import type { GraphNode, IndexSymbol } from '@/types'

/**
 * Display-only classification of a graph node. The wire format only carries
 * `module | class | function`, so method/route/test are recovered from the
 * stored index summary when it is available, and from the file path otherwise.
 * Nothing here changes the API contract or the deterministic analysis result.
 */
export type DisplayNodeKind =
  | 'module'
  | 'class'
  | 'function'
  | 'method'
  | 'route'
  | 'test'

export interface NodeKindMeta {
  label: string
  /** Bright fill used for graph nodes on the dark canvas. */
  color: string
  /** AA-safe text color for the same hue on light surfaces. */
  ink: string
  /** Matching soft surface for chips. */
  tint: string
}

export const NODE_KIND_META: Record<DisplayNodeKind, NodeKindMeta> = {
  module: { label: 'Module', color: hues.brand.graph, ink: hues.brand.ink, tint: hues.brand.tint },
  function: { label: 'Function', color: hues.teal.graph, ink: hues.teal.ink, tint: hues.teal.tint },
  class: { label: 'Class', color: hues.violet.graph, ink: hues.violet.ink, tint: hues.violet.tint },
  method: { label: 'Method', color: hues.amber.graph, ink: hues.amber.ink, tint: hues.amber.tint },
  route: { label: 'Route', color: hues.rose.graph, ink: hues.rose.ink, tint: hues.rose.tint },
  test: { label: 'Test', color: hues.emerald.graph, ink: hues.emerald.ink, tint: hues.emerald.tint },
}

export const LEGEND_KINDS: readonly DisplayNodeKind[] = [
  'module',
  'function',
  'class',
  'method',
  'route',
  'test',
]

/** Map `file:name` to the richer symbol kind stored by the indexer. */
export function buildSymbolKindMap(
  symbols: readonly IndexSymbol[] | undefined,
): Map<string, DisplayNodeKind> {
  const map = new Map<string, DisplayNodeKind>()
  for (const symbol of symbols ?? []) {
    map.set(`${symbol.file}:${symbol.name}`, symbol.kind as DisplayNodeKind)
  }
  return map
}

function symbolName(node: GraphNode): string {
  const name = node.id.slice(node.id.lastIndexOf(':') + 1)
  return name || node.label
}

function isTestPath(file: string, name: string): boolean {
  const lower = file.toLowerCase()
  return (
    /(^|\/)(tests?|__tests__)(\/|$)/.test(lower) ||
    lower.includes('_test') ||
    lower.includes('.test.') ||
    name.startsWith('test_')
  )
}

function isRoutePath(file: string): boolean {
  return /(^|\/)(routers?|routes?|views?|api|endpoints?)(\/|$)/i.test(file)
}

/**
 * The graph endpoint only emits `class` vs `function` for symbols. Recover the
 * other hues from local evidence: the summary kind, the symbol name and its
 * file path. Defaults to `function`, never to an invented data source.
 */
export function displayKindForNode(
  node: GraphNode,
  symbolKinds?: Map<string, DisplayNodeKind>,
): DisplayNodeKind {
  if (node.kind === 'module') return 'module'

  const name = symbolName(node)
  if (isTestPath(node.file, name)) return 'test'

  const stored = symbolKinds?.get(`${node.file}:${name}`)
  if (stored === 'class' || stored === 'method') return stored
  if (node.kind === 'class') return 'class'

  if (isRoutePath(node.file)) return 'route'
  return 'function'
}
