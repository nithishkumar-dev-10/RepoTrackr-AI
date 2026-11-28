"""Command line entry point: python -m app.pipeline.graph <folder>

Prints the top central modules, a suggested reading order and a Mermaid diagram.
"""

import argparse

from app.pipeline.graph.builder import build_graph
from app.pipeline.indexer import index_repo


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m app.pipeline.graph",
        description="Build the import/call graph for a folder of Python code.",
    )
    parser.add_argument("folder", help="folder to index and graph")
    args = parser.parse_args(argv)

    repo = index_repo(args.folder)
    result = build_graph(repo)

    print("top modules (centrality):")
    for i, score in enumerate(result.centrality[:5], 1):
        print(
            f"  {i}. {score.module}  score={score.score:.3f}"
            f" (in_degree={score.in_degree}, pagerank={score.pagerank:.4f})"
        )

    print("\nreading order (first 10):")
    for i, module in enumerate(result.reading_order[:10], 1):
        print(f"  {i}. {module}")

    print("\nmermaid:")
    print(result.mermaid)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
