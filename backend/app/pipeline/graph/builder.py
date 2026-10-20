"""Build the graph from a RepoIndex: modules, symbols, imports, calls, centrality.

Everything here works purely on the indexer's output — analyzed code is never
imported or executed.
"""

import os

import networkx as nx

from app.pipeline.graph.mermaid import mermaid_diagram
from app.pipeline.graph.models import CentralityScore, GraphEdge, GraphNode, GraphResult
from app.pipeline.graph.reading_order import reading_order
from app.pipeline.indexer.models import ImportRef, RepoIndex


# -------------------------------------------------------- import resolution

def _resolve_dotted(parts: list[str], indexed: set[str]) -> str | None:
    """Map a dotted path to an indexed file: "a/b.py", else package "a/b/__init__.py"."""
    if not parts:
        return None
    dotted = "/".join(parts)
    for candidate in (f"{dotted}.py", f"{dotted}/__init__.py"):
        if candidate in indexed:
            return candidate
    return None


def _resolve_bindings(ref: ImportRef, indexed: set[str], root_name: str = "") -> dict[str, str]:
    """Map the local name an import binds to the index file it points at.

    "import os"            binds "os"     -> unresolvable here, skipped
    "import a.b as x"      binds "x"      -> "a/b.py"
    "from a.b import c"    binds "c"      -> "a/b/c.py" or "a/b.py" (a name in a.b)
    "from . import x"      binds "x"      -> "<own folder>/x.py"
    Stdlib and third-party imports resolve to nothing and are skipped.
    """
    parts = [p for p in ref.module.split(".") if p] if ref.module else []
    binding = ref.alias or (parts[0] if parts else "")  # name a plain "import a.b" binds

    # Relative import: begin in the file's own folder, go up (level - 1) folders.
    base: list[str] = []
    if ref.level >= 1:
        parent = ref.file.rsplit("/", 1)[0] if "/" in ref.file else ""
        parent_parts = parent.split("/") if parent else []
        if ref.level - 1 > len(parent_parts):
            return {}  # would escape the repo root
        base = parent_parts[: len(parent_parts) - (ref.level - 1)] + parts
    else:
        # The indexed folder can itself be a package: the code writes "app.x"
        # but index paths are relative to app/, so the folder name has to go.
        if root_name and parts[:1] == [root_name]:
            parts = parts[1:]
        base = parts

    if not ref.names:  # plain "import a.b": the module itself is the target
        target = _resolve_dotted(base, indexed)
        return {binding: target} if target and binding else {}

    bindings: dict[str, str] = {}
    for name in ref.names:
        if name == "*":
            target = _resolve_dotted(base, indexed)
        else:
            # The name may be a submodule ("a/b/c.py") or a symbol living in the
            # package's __init__.py — try the submodule, then the package itself.
            target = _resolve_dotted(base + [name], indexed) or _resolve_dotted(base, indexed)
        if not target:
            continue
        # Local name: the alias when there is exactly one, else the plain name.
        local = ref.alias or name
        bindings.setdefault(local, target)
    return bindings


def _import_edges(repo: RepoIndex, indexed: set[str], root_name: str) -> list[tuple[str, str]]:
    """Module-level edges: one file importing another file inside the repo."""
    edges: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for file_index in repo.files:
        if file_index.parse_error:
            continue
        for ref in file_index.imports:
            for target in _resolve_bindings(ref, indexed, root_name).values():
                if target != file_index.file and (file_index.file, target) not in seen:
                    seen.add((file_index.file, target))
                    edges.append((file_index.file, target))
    return edges


# ---------------------------------------------------------------- call graph

def _symbol_tables(repo: RepoIndex) -> dict[str, dict[str, list[str]]]:
    """file -> symbol name -> symbol ids (a name can occur twice, e.g. fallback defs)."""
    tables: dict[str, dict[str, list[str]]] = {}
    for symbol in repo.symbols:
        tables.setdefault(symbol.file, {}).setdefault(symbol.name, []).append(
            f"{symbol.file}:{symbol.name}"
        )
    return tables


def _call_edges(repo: RepoIndex, indexed: set[str], root_name: str) -> list[tuple[str, str]]:
    """Symbol-level edges from the resolvable calls the indexer extracted.

    A call resolves to a symbol in the same file, or to a symbol in the file
    its import points at. Calls the indexer could not resolve are absent from
    the RepoIndex, so there is nothing to do with them here.
    """
    tables = _symbol_tables(repo)

    # file -> locally bound name -> file it points at
    imports_by_file: dict[str, dict[str, str]] = {}
    for file_index in repo.files:
        if file_index.parse_error:
            continue
        table: dict[str, str] = {}
        for ref in file_index.imports:
            for local, target in _resolve_bindings(ref, indexed, root_name).items():
                table.setdefault(local, target)
        imports_by_file[file_index.file] = table

    edges: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for file_index in repo.files:
        if file_index.parse_error:
            continue
        for call in file_index.calls:
            if call.caller is None:
                continue  # module-level call: no symbol to hang the edge on
            callers = tables.get(file_index.file, {}).get(call.caller, [])
            # Callee: defined in this file, otherwise imported from another file.
            callees = list(tables.get(file_index.file, {}).get(call.callee, []))
            if not callees:
                target_file = imports_by_file.get(file_index.file, {}).get(call.callee)
                if target_file:
                    callees = tables.get(target_file, {}).get(call.callee, [])
            for caller_id in callers:
                for callee_id in callees:
                    if (caller_id, callee_id) not in seen:
                        seen.add((caller_id, callee_id))
                        edges.append((caller_id, callee_id))
    return edges


# ---------------------------------------------------------------- centrality

def _pagerank(graph: nx.DiGraph, damping: float = 0.85, iterations: int = 50) -> dict[str, float]:
    """Textbook PageRank in pure Python (networkx's own version needs numpy).

    Every node starts with equal rank. Each iteration, a node passes its rank
    along its outgoing edges while keeping (1 - damping) of it; nodes without
    outgoing edges spread their rank uniformly over everyone (the "dangling"
    case). 50 iterations is plenty to converge on repos of this size.
    """
    nodes = list(graph.nodes)
    if not nodes:
        return {}
    n = len(nodes)
    rank = {node: 1.0 / n for node in nodes}
    for _ in range(iterations):
        next_rank = {node: (1 - damping) / n for node in nodes}
        for node in nodes:
            share = rank[node]
            targets = list(graph.successors(node))
            if targets:
                share /= len(targets)
                for target in targets:
                    next_rank[target] += share
            else:  # dangling node: split its rank evenly among all nodes
                for other in nodes:
                    next_rank[other] += share / n
        rank = next_rank
    return rank


def _centrality(modules: list[str], import_edges: list[tuple[str, str]]) -> list[CentralityScore]:
    """Rank modules: normalized in-degree + normalized PageRank, best first."""
    graph = nx.DiGraph()
    graph.add_nodes_from(modules)
    graph.add_edges_from(import_edges)

    pagerank = _pagerank(graph)
    max_in = max((graph.in_degree(m) for m in modules), default=0)
    max_pr = max(pagerank.values(), default=0.0)

    scores: list[CentralityScore] = []
    for module in modules:
        in_degree = graph.in_degree(module)
        pr = pagerank.get(module, 0.0)
        # Each measure is scaled to 0..1 so the two very different scales can be added.
        score = (in_degree / max_in if max_in else 0.0) + (pr / max_pr if max_pr else 0.0)
        scores.append(CentralityScore(module=module, in_degree=in_degree, pagerank=pr, score=score))

    scores.sort(key=lambda s: (-s.score, s.module))  # ties broken by name, deterministic
    return scores


# -------------------------------------------------------------- build_graph

def build_graph(repo: RepoIndex) -> GraphResult:
    """Turn a RepoIndex into nodes, edges, a centrality ranking, a reading order and a diagram."""
    indexed = {f.file for f in repo.files if f.parse_error is None}
    modules = sorted(indexed)
    # Folder name of the indexed root; it prefixes imports when the folder is a package.
    root_name = os.path.basename(os.path.normpath(repo.root))

    imports = _import_edges(repo, indexed, root_name)
    calls = _call_edges(repo, indexed, root_name)
    centrality = _centrality(modules, imports)

    entry_modules = sorted(f.file for f in repo.files if f.entry_points and not f.parse_error)
    order = reading_order(modules, imports, entry_modules, centrality)
    mermaid = mermaid_diagram(centrality, imports)

    nodes = [GraphNode(id=m, kind="module", label=m, file=m) for m in modules]
    nodes += [
        GraphNode(id=f"{s.file}:{s.name}", kind="symbol", label=f"{s.file}:{s.name}", file=s.file)
        for s in repo.symbols
    ]
    edges = [GraphEdge(source=a, target=b, kind="import") for a, b in imports]
    edges += [GraphEdge(source=a, target=b, kind="call") for a, b in calls]
    return GraphResult(
        nodes=nodes,
        edges=edges,
        centrality=centrality,
        reading_order=order,
        mermaid=mermaid,
    )
