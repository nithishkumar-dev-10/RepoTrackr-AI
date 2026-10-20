from typing import Literal
from pydantic import BaseModel, Field

NodeKind = Literal["module", "symbol"]
EdgeKind = Literal["import", "call"]


class GraphNode(BaseModel):
    """One point in the graph.

    Modules are files ("core/config.py"); symbols are functions/classes/methods
    and carry their file plus name ("core/config.py:get_settings").
    """

    id: str
    kind: NodeKind
    label: str  # human-readable text (path or file:name)
    file: str  # source file the node came from


class GraphEdge(BaseModel):
    """A directed link: source -> target.

    "import": one module file imports another.
    "call":   one symbol calls another symbol.
    """

    source: str
    target: str
    kind: EdgeKind


class CentralityScore(BaseModel):
    """How important one module is, measured two ways and combined."""

    module: str  # node id of the module
    in_degree: int  # how many modules import it
    pagerank: float  # PageRank value from the import graph
    score: float  # normalized in_degree + normalized pagerank


class GraphResult(BaseModel):
    """Everything the graph layer knows: nodes, edges, rankings and a diagram."""

    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
    centrality: list[CentralityScore] = Field(default_factory=list)  # best first
    reading_order: list[str] = Field(default_factory=list)  # module ids to read in order
    mermaid: str = ""  # module-level flowchart, capped for readability
