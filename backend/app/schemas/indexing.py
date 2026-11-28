from pydantic import BaseModel, Field


class IndexStartOut(BaseModel):
    status: str
    message: str


class IndexStatusOut(BaseModel):
    status: str
    commit_sha: str | None = None
    error_message: str | None = None


class IndexSymbolOut(BaseModel):
    name: str
    kind: str
    file: str
    line_start: int
    line_end: int
    signature: str | None = None
    docstring: str | None = None
    parent: str | None = None


class GraphNodeOut(BaseModel):
    """A node as produced by build_graph() and persisted in the summary."""

    id: str
    kind: str
    label: str
    file: str


class GraphEdgeOut(BaseModel):
    source: str
    target: str
    kind: str


class CentralityOut(BaseModel):
    module: str
    in_degree: int = 0
    pagerank: float = 0.0
    score: float = 0.0


class GraphViewNode(BaseModel):
    """Frontend GraphNode contract from frontend/src/types/graph.ts."""

    id: str
    label: str
    kind: str
    cluster: str
    centrality: float
    file: str
    line: int
    isEntry: bool


class GraphViewEdge(BaseModel):
    source: str
    target: str
    type: str


class GraphClusterOut(BaseModel):
    id: str
    label: str


class GraphOut(BaseModel):
    nodes: list[GraphViewNode] = Field(default_factory=list)
    edges: list[GraphViewEdge] = Field(default_factory=list)
    clusters: list[GraphClusterOut] = Field(default_factory=list)
    truncated: bool = False


class IndexSummaryOut(BaseModel):
    commit_sha: str
    file_tree: list[str] = Field(default_factory=list)
    symbol_counts: dict[str, int] = Field(default_factory=dict)
    total_symbols: int = 0
    modules: list[str] = Field(default_factory=list)
    entry_points: list[str] = Field(default_factory=list)
    symbols: list[IndexSymbolOut] = Field(default_factory=list)
    files_indexed: int = 0
    files_parsed: int = 0
    files_cached: int = 0
    files_skipped: list[str] = Field(default_factory=list)
    graph_node_count: int = 0
    graph_edge_count: int = 0
    graph_nodes: list[GraphNodeOut] = Field(default_factory=list)
    graph_edges: list[GraphEdgeOut] = Field(default_factory=list)
    centrality: list[CentralityOut] = Field(default_factory=list)
    lines_of_code: int = 0
    index_seconds: float = 0.0
    seconds_per_10k_loc: float = 0.0
