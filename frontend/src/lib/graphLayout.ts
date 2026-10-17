import type { Graph, GraphNode } from '@/types'

export const CLUSTER_PALETTE = [
  '#3B5BFF',
  '#16A34A',
  '#F59E0B',
  '#8B5CF6',
  '#06B6D4',
  '#EC4899',
  '#64748B',
] as const

export const MAX_VISIBLE_NODES = 1500

export interface PositionedNode extends GraphNode {
  x: number
  y: number
  z: number
  clusterIndex: number
  clusterColor: string
}

export interface ClusterCenter {
  id: string
  label: string
  x: number
  y: number
  z: number
  color: string
}

/**
 * Deterministic layout shared by the 2D and 3D views: clusters sit on a ring,
 * nodes spiral inside their cluster. No randomness, so both views agree.
 */
export function layoutGraph(
  graph: Graph,
  options: { moduleOnly?: boolean; maxNodes?: number } = {},
): { nodes: PositionedNode[]; clusters: ClusterCenter[] } {
  const { moduleOnly = true, maxNodes = MAX_VISIBLE_NODES } = options
  const clusterIndex = new Map(graph.clusters.map((c, i) => [c.id, i]))

  const clusterCenters: ClusterCenter[] = graph.clusters.map((c, i) => {
    const angle = (i / graph.clusters.length) * Math.PI * 2
    const radius = 24
    return {
      id: c.id,
      label: c.label,
      x: Math.cos(angle) * radius,
      y: 0,
      z: Math.sin(angle) * radius,
      color: CLUSTER_PALETTE[i % CLUSTER_PALETTE.length],
    }
  })
  const centerById = new Map(clusterCenters.map((c) => [c.id, c]))

  const grouped = new Map<string, GraphNode[]>()
  for (const node of graph.nodes) {
    if (moduleOnly && node.kind !== 'module') continue
    const list = grouped.get(node.cluster) ?? []
    list.push(node)
    grouped.set(node.cluster, list)
  }

  const nodes: PositionedNode[] = []
  for (const [clusterId, list] of grouped) {
    const center = centerById.get(clusterId)
    if (!center) continue
    for (let j = 0; j < list.length; j += 1) {
      if (nodes.length >= maxNodes) break
      const node = list[j]
      const t = (j + 0.5) / list.length
      const r = 5.5 * Math.sqrt(t)
      const theta = j * 2.399963
      nodes.push({
        ...node,
        x: center.x + Math.cos(theta) * r,
        y: Math.sin(theta * 1.3) * r * 0.7,
        z: center.z + Math.sin(theta) * r,
        clusterIndex: clusterIndex.get(clusterId) ?? 0,
        clusterColor: center.color,
      })
    }
    if (nodes.length >= maxNodes) break
  }

  return { nodes, clusters: clusterCenters }
}

/** Undirected adjacency of node ids. */
export function buildAdjacency(graph: Graph): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>()
  const ensure = (id: string) => {
    let set = adjacency.get(id)
    if (!set) {
      set = new Set()
      adjacency.set(id, set)
    }
    return set
  }
  for (const edge of graph.edges) {
    ensure(edge.source).add(edge.target)
    ensure(edge.target).add(edge.source)
  }
  return adjacency
}

/** Maps a list of node ids to their positioned nodes (skips missing). */
export function positionsForIds(
  ids: string[],
  nodes: PositionedNode[],
): PositionedNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return ids.map((id) => byId.get(id)).filter((n): n is PositionedNode => Boolean(n))
}
