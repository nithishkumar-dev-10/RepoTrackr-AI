import {
  displayKindForNode,
  NODE_KIND_META,
  type DisplayNodeKind,
} from '@/lib/graphVisuals'
import type { Graph, GraphNode } from '@/types'

export const CLUSTER_PALETTE = [
  '#3B5BFF',
  '#8B5CF6',
  '#06B6D4',
  '#F59E0B',
  '#EC4899',
  '#10B981',
  '#64748B',
] as const

export const MAX_VISIBLE_NODES = 1500

/** View-space radius of a node: always readable, then scaled by centrality. */
export function nodeRadius(centrality: number): number {
  return 2.2 + Math.min(1, Math.max(0, centrality)) * 3.4
}

export interface PositionedNode extends GraphNode {
  x: number
  y: number
  z: number
  clusterIndex: number
  clusterColor: string
  groupId: string
  displayKind: DisplayNodeKind
  typeColor: string
}

export interface ClusterCenter {
  id: string
  label: string
  x: number
  y: number
  z: number
  color: string
}

/** A faint 2D hull, never a filled blob. */
export interface ClusterHull extends ClusterCenter {
  /** Closed polygon in view coordinates (x, z). */
  points: Array<[number, number]>
  labelY: number
}

export interface GraphLayout {
  nodes: PositionedNode[]
  clusters: ClusterHull[]
}

interface Group {
  id: string
  label: string
  nodes: GraphNode[]
}

function parentFolder(file: string): string {
  const parts = file.replace(/\\/g, '/').split('/')
  if (parts.length <= 1) return 'root'
  return parts.slice(0, -1).join('/') || 'root'
}

function groupNodes(
  visible: GraphNode[],
  wireClusterCount: number,
): Group[] {
  const useWireClusters = wireClusterCount > 1
  const groups = new Map<string, Group>()
  const add = (id: string, label: string, node: GraphNode) => {
    const group = groups.get(id)
    if (group) group.nodes.push(node)
    else groups.set(id, { id, label, nodes: [node] })
  }

  const folders = new Set(visible.map((node) => parentFolder(node.file)))
  if (folders.size > 1 || useWireClusters) {
    for (const node of visible) {
      const folder = parentFolder(node.file)
      if (folders.size > 1) add(folder, folder, node)
      else add(`cluster:${node.cluster}`, node.cluster, node)
    }
  } else {
    // A single folder/module: fall back to one group per file so the graph
    // still spreads out instead of becoming one giant cluster.
    for (const node of visible) add(`file:${node.file}`, node.file, node)
  }

  return [...groups.values()].sort((a, b) => a.id.localeCompare(b.id))
}

function initialPositions(groups: Group[]): Map<string, { x: number; y: number; z: number }> {
  const positions = new Map<string, { x: number; y: number; z: number }>()
  const ring = 22 + Math.sqrt(groups.length) * 8
  groups.forEach((group, groupIndex) => {
    const angle = (groupIndex / groups.length) * Math.PI * 2
    const cx = groups.length === 1 ? 0 : Math.cos(angle) * ring
    const cz = groups.length === 1 ? 0 : Math.sin(angle) * ring
    group.nodes.forEach((node, index) => {
      const t = (index + 0.5) / group.nodes.length
      const radius = 9 * Math.sqrt(t)
      const theta = index * 2.399963
      positions.set(node.id, {
        x: cx + Math.cos(theta) * radius,
        y: Math.sin(theta * 1.7) * radius * 0.45,
        z: cz + Math.sin(theta) * radius,
      })
    })
  })
  return positions
}

/**
 * Deterministic force placement: pairwise repulsion, short springs along the
 * real edges, a weak pull toward the group anchor and collision handling. No
 * randomness, so the 2D and 3D views always agree.
 */
function relax(
  nodes: GraphNode[],
  edges: Graph['edges'],
  positions: Map<string, { x: number; y: number; z: number }>,
  anchor: Map<string, { x: number; y: number; z: number }>,
): void {
  const visible = new Set(nodes.map((node) => node.id))
  const links = edges.filter(
    (edge) => visible.has(edge.source) && visible.has(edge.target),
  )
  const velocity = new Map(
    nodes.map((node) => [node.id, { x: 0, y: 0, z: 0 }]),
  )
  const iterations = 120

  for (let step = 0; step < iterations; step += 1) {
    for (const node of nodes) {
      const v = velocity.get(node.id)!
      v.x *= 0.82
      v.y *= 0.82
      v.z *= 0.82
    }

    for (let i = 0; i < nodes.length; i += 1) {
      const a = positions.get(nodes[i].id)!
      const va = velocity.get(nodes[i].id)!
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = positions.get(nodes[j].id)!
        const vb = velocity.get(nodes[j].id)!
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dz = a.z - b.z
        const dist2 = dx * dx + dy * dy + dz * dz + 0.25
        const distance = Math.sqrt(dist2)
        const push = 240 / dist2
        const nx = dx / distance
        const ny = dy / distance
        const nz = dz / distance
        va.x += nx * push
        va.y += ny * push
        va.z += nz * push
        vb.x -= nx * push
        vb.y -= ny * push
        vb.z -= nz * push

        const minDistance = nodeRadius(nodes[i].centrality) + nodeRadius(nodes[j].centrality) + 1.5
        if (distance < minDistance) {
          const collision = (minDistance - distance) * 0.45
          va.x += nx * collision
          va.y += ny * collision
          va.z += nz * collision
          vb.x -= nx * collision
          vb.y -= ny * collision
          vb.z -= nz * collision
        }
      }
    }

    for (const edge of links) {
      const a = positions.get(edge.source)!
      const b = positions.get(edge.target)!
      const va = velocity.get(edge.source)!
      const vb = velocity.get(edge.target)!
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dz = b.z - a.z
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01
      const pull = (distance - 14) * 0.012
      const nx = (dx / distance) * pull
      const ny = (dy / distance) * pull
      const nz = (dz / distance) * pull
      va.x += nx
      va.y += ny
      va.z += nz
      vb.x -= nx
      vb.y -= ny
      vb.z -= nz
    }

    for (const node of nodes) {
      const position = positions.get(node.id)!
      const v = velocity.get(node.id)!
      const home = anchor.get(node.id)!
      v.x += (home.x - position.x) * 0.008
      v.y += (home.y - position.y) * 0.008
      v.z += (home.z - position.z) * 0.008
      v.x -= position.x * 0.0005
      v.z -= position.z * 0.0005

      const speed = Math.hypot(v.x, v.y, v.z)
      const limit = 3
      const scale = speed > limit ? limit / speed : 1
      position.x += v.x * scale
      position.y += v.y * scale
      position.z += v.z * scale
    }
  }
}

function cross(o: [number, number], a: [number, number], b: [number, number]): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
}

/** Monotone-chain convex hull of the group's projected nodes. */
function convexHull(points: Array<[number, number]>): Array<[number, number]> {
  if (points.length < 3) return points
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const lower: Array<[number, number]> = []
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop()
    }
    lower.push(point)
  }
  const upper: Array<[number, number]> = []
  for (const point of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop()
    }
    upper.push(point)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

function inflateHull(
  hull: Array<[number, number]>,
  padding: number,
): Array<[number, number]> {
  if (hull.length === 0) return []
  const cx = hull.reduce((sum, point) => sum + point[0], 0) / hull.length
  const cz = hull.reduce((sum, point) => sum + point[1], 0) / hull.length
  return hull.map(([x, z]) => {
    const angle = Math.atan2(z - cz, x - cx)
    return [x + Math.cos(angle) * padding, z + Math.sin(angle) * padding]
  })
}

/**
 * Deterministic layout shared by the 2D and 3D views. Groups use the nearest
 * parent folder (or per-file fallback for a single group), nodes are placed by
 * a bounded force simulation, then everything is centered on the origin.
 */
export function layoutGraph(
  graph: Graph,
  options: {
    maxNodes?: number
    symbolKinds?: Map<string, DisplayNodeKind>
  } = {},
): GraphLayout {
  const { maxNodes = MAX_VISIBLE_NODES, symbolKinds } = options
  const visible = graph.nodes.slice(0, maxNodes)
  const groups = groupNodes(visible, graph.clusters.length)
  const positions = initialPositions(groups)
  const anchor = new Map(
    [...positions].map(([id, point]) => [id, { ...point }]),
  )
  relax(visible, graph.edges, positions, anchor)

  const xs = visible.map((node) => positions.get(node.id)!.x)
  const ys = visible.map((node) => positions.get(node.id)!.y)
  const zs = visible.map((node) => positions.get(node.id)!.z)
  const minX = Math.min(...xs, 0)
  const maxX = Math.max(...xs, 0)
  const minY = Math.min(...ys, 0)
  const maxY = Math.max(...ys, 0)
  const minZ = Math.min(...zs, 0)
  const maxZ = Math.max(...zs, 0)
  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2
  const midZ = (minZ + maxZ) / 2
  const scale = 160 / Math.max(maxX - minX, maxZ - minZ, 1)

  const nodes: PositionedNode[] = visible.map((node) => {
    const point = positions.get(node.id)!
    const displayKind = displayKindForNode(node, symbolKinds)
    return {
      ...node,
      x: (point.x - midX) * scale,
      y: (point.y - midY) * scale * 0.65,
      z: (point.z - midZ) * scale,
      clusterIndex: -1,
      clusterColor: '#000000',
      groupId: '',
      displayKind,
      typeColor: NODE_KIND_META[displayKind].color,
    }
  })

  const byId = new Map(nodes.map((node) => [node.id, node]))
  const clusters: ClusterHull[] = groups.map((group, index) => {
    const members = group.nodes
      .map((node) => byId.get(node.id))
      .filter((node): node is PositionedNode => Boolean(node))
    const x = members.reduce((sum, node) => sum + node.x, 0) / (members.length || 1)
    const y = members.reduce((sum, node) => sum + node.y, 0) / (members.length || 1)
    const z = members.reduce((sum, node) => sum + node.z, 0) / (members.length || 1)
    const projected = members.map((node) => [node.x, node.z] as [number, number])
    const rawHull = convexHull(projected)
    const hull =
      rawHull.length >= 3
        ? inflateHull(rawHull, 4.5)
        : (() => {
            const radius = 9
            return [
              [x - radius, z],
              [x, z - radius],
              [x + radius, z],
              [x, z + radius],
            ] as Array<[number, number]>
          })()
    const color = CLUSTER_PALETTE[index % CLUSTER_PALETTE.length]
    for (const member of members) {
      member.clusterIndex = index
      member.clusterColor = color
      member.groupId = group.id
    }
    return {
      id: group.id,
      label: group.label,
      x,
      y,
      z,
      color,
      points: hull,
      labelY: Math.min(...hull.map((point) => point[1]), z) - 3,
    }
  })

  return { nodes, clusters }
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

/** Directional counts used by the node detail card (incoming = callers). */
export function buildCallCounts(graph: Graph): Map<string, { callers: number; callees: number }> {
  const counts = new Map<string, { callers: number; callees: number }>()
  const entry = (id: string) => {
    let value = counts.get(id)
    if (!value) {
      value = { callers: 0, callees: 0 }
      counts.set(id, value)
    }
    return value
  }
  for (const edge of graph.edges) {
    entry(edge.source).callees += 1
    entry(edge.target).callers += 1
  }
  return counts
}

/** Maps a list of node ids to their positioned nodes (skips missing). */
export function positionsForIds(
  ids: string[],
  nodes: PositionedNode[],
): PositionedNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  return ids.map((id) => byId.get(id)).filter((node): node is PositionedNode => Boolean(node))
}
