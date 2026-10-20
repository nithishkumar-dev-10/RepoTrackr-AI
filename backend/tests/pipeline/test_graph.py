"""Tests for the graph layer: import graph, call graph, centrality, reading order, Mermaid."""

import re
from pathlib import Path

from app.pipeline.graph import GraphResult, build_graph
from app.pipeline.graph.mermaid import mermaid_diagram
from app.pipeline.graph.models import CentralityScore
from app.pipeline.graph.reading_order import reading_order
from app.pipeline.indexer import index_repo


def _write_repo(root: Path, files: dict[str, str]) -> Path:
    """Write a small repo tree for the tests."""
    for rel, content in files.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    return root


def _import_edges(graph: GraphResult) -> set[tuple[str, str]]:
    return {(e.source, e.target) for e in graph.edges if e.kind == "import"}


def _call_edges(graph: GraphResult) -> set[tuple[str, str]]:
    return {(e.source, e.target) for e in graph.edges if e.kind == "call"}


def _module_nodes(graph: GraphResult) -> list[str]:
    return [n.id for n in graph.nodes if n.kind == "module"]


# ------------------------------------------------------------- import graph

def test_simple_import_chain(tmp_path: Path):
    root = _write_repo(
        tmp_path,
        {
            "a.py": "import b\n",
            "b.py": "from c import leaf\n",
            "c.py": "def leaf():\n    return 1\n",
        },
    )
    graph = build_graph(index_repo(root))

    assert _module_nodes(graph) == ["a.py", "b.py", "c.py"]
    assert _import_edges(graph) == {("a.py", "b.py"), ("b.py", "c.py")}
    assert _call_edges(graph) == set()  # no calls in these files


def test_relative_imports_resolved(tmp_path: Path):
    root = _write_repo(
        tmp_path,
        {
            "pkg/helper.py": "def help_me():\n    pass\n",
            "pkg/mod.py": "from . import helper\n",
            "pkg/sub/deep.py": "from .. import helper\n",
        },
    )
    graph = build_graph(index_repo(root))

    # level 1: same folder; level 2: one folder up. Both land on pkg/helper.py.
    assert ("pkg/mod.py", "pkg/helper.py") in _import_edges(graph)
    assert ("pkg/sub/deep.py", "pkg/helper.py") in _import_edges(graph)


def test_unresolvable_imports_skipped(tmp_path: Path):
    root = _write_repo(
        tmp_path,
        {
            "f.py": (
                "import os\n"
                "from fastapi import FastAPI\n"
                "import totally.missing.thing\n"
                "def run():\n"
                "    pass\n"
            )
        },
    )
    graph = build_graph(index_repo(root))

    # stdlib, third party and missing modules produce no edges — and no crash
    assert _import_edges(graph) == set()
    assert _module_nodes(graph) == ["f.py"]


def test_import_of_indexed_package_itself_resolved(tmp_path: Path):
    # Index a folder that IS a package: the code writes "pkg.helper", the index
    # stores paths relative to pkg/ ("helper.py"). The prefix must still match.
    root = _write_repo(
        tmp_path,
        {
            "pkg/__init__.py": "",
            "pkg/helper.py": "def help_me():\n    pass\n",
            "pkg/mod.py": "from pkg.helper import help_me\n",
            "pkg/other.py": "import pkg.helper\n",
        },
    )
    graph = build_graph(index_repo(root / "pkg"))

    assert _import_edges(graph) == {("mod.py", "helper.py"), ("other.py", "helper.py")}
    assert graph.centrality[0].module == "helper.py"  # imported by two modules


def test_import_cycle_terminates(tmp_path: Path):
    root = _write_repo(
        tmp_path,
        {"a.py": "import b\n", "b.py": "import a\n"},
    )
    graph = build_graph(index_repo(root))  # must not hang

    assert _import_edges(graph) == {("a.py", "b.py"), ("b.py", "a.py")}
    assert sorted(graph.reading_order) == ["a.py", "b.py"]


# --------------------------------------------------------------- call graph

def test_call_graph_edge_same_file(tmp_path: Path):
    root = _write_repo(
        tmp_path,
        {
            "f.py": (
                "def helper():\n"
                "    return 1\n"
                "\n"
                "def main():\n"
                "    return helper()\n"
                "\n"
                "main()\n"  # module-level call: no caller symbol, no edge
            )
        },
    )
    graph = build_graph(index_repo(root))

    assert _call_edges(graph) == {("f.py:main", "f.py:helper")}


def test_call_graph_edge_across_files(tmp_path: Path):
    root = _write_repo(
        tmp_path,
        {
            "utils.py": "def build():\n    return 2\n",
            "main.py": "from utils import build\n\ndef run():\n    return build()\n",
        },
    )
    graph = build_graph(index_repo(root))

    assert _call_edges(graph) == {("main.py:run", "utils.py:build")}


# --------------------------------------------------------------- centrality

def test_centrality_ranks_most_imported_first(tmp_path: Path):
    root = _write_repo(
        tmp_path,
        {
            "hub.py": "def hub_fn():\n    pass\n",
            "one.py": "import hub\n",
            "two.py": "import hub\n",
            "three.py": "import hub\n",
        },
    )
    graph = build_graph(index_repo(root))

    assert graph.centrality[0].module == "hub.py"
    assert graph.centrality[0].in_degree == 3
    # scores are sorted best-first
    scores = [c.score for c in graph.centrality]
    assert scores == sorted(scores, reverse=True)


# ------------------------------------------------------------ reading order

def test_reading_order_starts_at_entry_point(tmp_path: Path):
    root = _write_repo(
        tmp_path,
        {
            "leaf.py": "def value():\n    return 1\n",
            "mid.py": "from leaf import value\n\ndef compute():\n    return value()\n",
            "entry.py": (
                "from mid import compute\n"
                "\n"
                "def main():\n"
                "    return compute()\n"
                "\n"
                'if __name__ == "__main__":\n'
                "    main()\n"
            ),
        },
    )
    graph = build_graph(index_repo(root))

    assert graph.reading_order[0] == "entry.py"  # the only entry point
    # breadth-first: what the entry imports comes before what those import
    assert graph.reading_order.index("mid.py") < graph.reading_order.index("leaf.py")


def test_reading_order_every_module_once(tmp_path: Path):
    root = _write_repo(
        tmp_path,
        {
            "a.py": "import b\n",
            "b.py": "import a\n",  # cycle
            "solo.py": "def lonely():\n    pass\n",  # never reached
        },
    )
    graph = build_graph(index_repo(root))

    assert len(graph.reading_order) == 3
    assert len(set(graph.reading_order)) == 3  # each module exactly once
    assert set(graph.reading_order) == {"a.py", "b.py", "solo.py"}


# ------------------------------------------------------------------ mermaid

def test_mermaid_valid_and_capped(tmp_path: Path):
    files = {"hub.py": "def hub_fn():\n    pass\n"}
    for i in range(20):  # 21 modules total -> must cap at 15
        files[f"m{i:02d}.py"] = "import hub\n"
    graph = build_graph(index_repo(_write_repo(tmp_path, files)))

    lines = graph.mermaid.splitlines()
    assert lines[0] == "flowchart TD"

    node_lines = [ln for ln in lines[1:] if '["' in ln]
    edge_lines = [ln for ln in lines[1:] if "-->" in ln]
    assert len(node_lines) == 15  # capped

    # every line is either a well-formed node or a well-formed edge
    node_ids = set()
    for ln in node_lines:
        match = re.fullmatch(r'    (n\d+)\["[^"]+"\]', ln)
        assert match, f"bad node line: {ln}"
        node_ids.add(match.group(1))
    for ln in edge_lines:
        match = re.fullmatch(r"    (n\d+) --> (n\d+)", ln)
        assert match, f"bad edge line: {ln}"
        assert match.group(1) in node_ids and match.group(2) in node_ids

    # the hub is the most central module, so it must be drawn (as n0)
    assert '    n0["hub.py"]' in node_lines


def test_mermaid_single_node(tmp_path: Path):
    root = _write_repo(tmp_path, {"only.py": "def one():\n    pass\n"})
    graph = build_graph(index_repo(root))

    assert graph.mermaid == 'flowchart TD\n    n0["only.py"]'


# ------------------------------------------------------------ edge cases

def test_empty_repo_does_not_crash(tmp_path: Path):
    graph = build_graph(index_repo(tmp_path))

    assert graph.nodes == []
    assert graph.edges == []
    assert graph.centrality == []
    assert graph.reading_order == []
    assert graph.mermaid == "flowchart TD"


def test_single_file_repo_does_not_crash(tmp_path: Path):
    root = _write_repo(tmp_path, {"only.py": "def one():\n    return 1\n"})
    graph = build_graph(index_repo(root))

    assert _module_nodes(graph) == ["only.py"]
    assert graph.edges == []
    assert graph.reading_order == ["only.py"]
    assert graph.mermaid.startswith("flowchart TD")


# ------------------------------------------------- direct unit tests (no files)

def test_reading_order_unit_no_entry_points_falls_back_to_centrality():
    centrality = [
        CentralityScore(module="b.py", in_degree=1, pagerank=0.4, score=2.0),
        CentralityScore(module="a.py", in_degree=1, pagerank=0.3, score=1.5),
        CentralityScore(module="solo.py", in_degree=0, pagerank=0.1, score=0.4),
    ]
    order = reading_order(
        modules=["a.py", "b.py", "solo.py"],
        import_edges=[("a.py", "b.py")],
        entry_modules=[],  # no entry points at all
        centrality=centrality,
    )
    # fallback: most central first
    assert order == ["b.py", "a.py", "solo.py"]


def test_mermaid_diagram_unit_edge_only_between_included_nodes():
    centrality = [
        CentralityScore(module=f"m{i}.py", in_degree=0, pagerank=0.0, score=float(10 - i))
        for i in range(20)
    ]
    edges = [("m0.py", "m1.py"), ("m0.py", "m19.py")]  # m19 is outside the cap
    diagram = mermaid_diagram(centrality, edges, cap=3)

    assert diagram.count("-->") == 1  # only the m0 -> m1 edge survives
    assert 'n0["m0.py"]' in diagram
    assert "m19" not in diagram
