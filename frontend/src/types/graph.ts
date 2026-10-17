/** Code graph contract shared by the 3D galaxy and the 2D fallback. */

export type NodeKind = 'module' | 'function' | 'class'

export type EdgeType = 'import' | 'call'

export interface GraphNode {
  id: string
  label: string
  kind: NodeKind
  cluster: string
  /** 0..1 importance; drives node size in the galaxy. */
  centrality: number
  file: string
  line: number
  isEntry: boolean
}

export interface GraphEdge {
  source: string
  target: string
  type: EdgeType
}

export interface GraphCluster {
  id: string
  label: string
}

export interface Graph {
  nodes: GraphNode[]
  edges: GraphEdge[]
  clusters: GraphCluster[]
}
