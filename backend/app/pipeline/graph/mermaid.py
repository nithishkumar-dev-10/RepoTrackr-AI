from app.pipeline.graph.models import CentralityScore


def mermaid_diagram(
    centrality: list[CentralityScore],
    import_edges: list[tuple[str, str]],
    cap: int = 15,
) -> str:
    """Render the module import graph as a Mermaid flowchart.

    Only the top `cap` modules by centrality are drawn, so the diagram stays
    readable on real repos. Node IDs are plain (n0, n1, ...) because Mermaid
    IDs cannot contain characters like "/" or "."; file paths go in labels.
    """
    top = [score.module for score in centrality[:cap]]
    node_ids = {module: f"n{i}" for i, module in enumerate(top)}

    lines = ["flowchart TD"]
    for module in top:
        label = module.replace('"', "'")  # labels are quoted; stay safe anyway
        lines.append(f'    {node_ids[module]}["{label}"]')
    for source, target in import_edges:
        # Only draw edges whose two ends are both in the capped set.
        if source in node_ids and target in node_ids:
            lines.append(f"    {node_ids[source]} --> {node_ids[target]}")
    return "\n".join(lines)
