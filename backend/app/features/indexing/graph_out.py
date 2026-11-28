"""Map the persisted deterministic graph onto the frontend Graph contract.

The graph itself is built by ``app.pipeline.graph.builder.build_graph`` and
stored with the index summary. This module only reshapes it for the UI; it
never changes what the deterministic analysis decided.
"""

from app.schemas.indexing import (
    GraphClusterOut,
    GraphOut,
    GraphViewEdge,
    GraphViewNode,
    IndexSummaryOut,
)

# Bounds for the browser renderer. Edges are dropped when either endpoint was
# capped, so no edge ever points at a node the response does not contain.
MAX_NODES = 300
MAX_EDGES = 1000


def _cluster(file: str) -> str:
    head, separator, _ = file.partition("/")
    return head if separator else "root"


def graph_from_summary(summary: IndexSummaryOut) -> GraphOut:
    """Build the API graph response from one validated index summary."""
    symbol_kinds = {(s.file, s.name): s.kind for s in summary.symbols}
    symbol_lines = {(s.file, s.name): s.line_start for s in summary.symbols}

    entry_files: set[str] = set()
    entry_symbols: set[tuple[str, str]] = set()
    for entry in summary.entry_points:
        file, separator, name = entry.partition(":")
        entry_files.add(file)
        if separator:
            entry_symbols.add((file, name.strip()))

    scores = {score.module: score.score for score in summary.centrality}
    max_score = max(scores.values(), default=0.0) or 1.0
    reading_order = {module: index for index, module in enumerate(summary.modules)}

    nodes: list[GraphViewNode] = []
    for node in summary.graph_nodes:
        if node.kind == "module":
            kind = "module"
            line = 1
            is_entry = node.file in entry_files
        else:
            file, _, name = node.id.rpartition(":")
            kind = "class" if symbol_kinds.get((file, name)) == "class" else "function"
            line = symbol_lines.get((file, name), 1)
            is_entry = (file, name) in entry_symbols

        centrality = scores.get(node.file, 0.0) / max_score
        nodes.append(
            GraphViewNode(
                id=node.id,
                label=node.label,
                kind=kind,
                cluster=_cluster(node.file),
                centrality=round(min(1.0, max(0.0, centrality)), 4),
                file=node.file,
                line=line,
                isEntry=is_entry,
            )
        )

    truncated = False
    if len(nodes) > MAX_NODES:
        nodes.sort(
            key=lambda node: (
                node.kind != "module",
                reading_order.get(node.file, len(reading_order)),
                node.id,
            )
        )
        nodes = nodes[:MAX_NODES]
        truncated = True

    allowed = {node.id for node in nodes}
    edges = [
        GraphViewEdge(source=edge.source, target=edge.target, type=edge.kind)
        for edge in summary.graph_edges
        if edge.source in allowed and edge.target in allowed
    ]
    if len(edges) > MAX_EDGES:
        edges = edges[:MAX_EDGES]
        truncated = True

    clusters = sorted({node.cluster for node in nodes})
    return GraphOut(
        nodes=nodes,
        edges=edges,
        clusters=[GraphClusterOut(id=name, label=name) for name in clusters],
        truncated=truncated,
    )
