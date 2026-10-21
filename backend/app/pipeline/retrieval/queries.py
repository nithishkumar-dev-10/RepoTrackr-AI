"""Run every query in a text file:
python -m app.pipeline.retrieval.queries <file> [--sha SHA] [--db PATH]

The file holds one query per line; blank lines and lines starting with #
are skipped. Prints the top 5 results per query as: rank | score | symbol | file:line
"""

import argparse
import sys
from pathlib import Path

from app.pipeline.retrieval import (
    DEFAULT_DB_PATH,
    default_commit_sha,
    load_index,
)

TOP_K = 5  # fixed by the step spec: every query prints its top 5


def _read_queries(path: Path) -> list[str]:
    """The queries in the file: non-blank lines that are not # comments."""
    queries = []
    for line in path.read_text(encoding="utf-8").splitlines():
        text = line.strip()
        if text and not text.startswith("#"):
            queries.append(text)
    return queries


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m app.pipeline.retrieval.queries",
        description="Run every query in a text file against the BM25 baseline.",
    )
    parser.add_argument("file", help="text file with one query per line")
    parser.add_argument(
        "--sha",
        default=None,
        help="commit SHA to search (default: the SHA with the most chunks in the DB)",
    )
    parser.add_argument("--db", default=None, help=f"SQLite path (default: {DEFAULT_DB_PATH})")
    args = parser.parse_args(argv)

    path = Path(args.file)
    if not path.exists():
        print(f"error: query file not found: {path}", file=sys.stderr)
        return 1

    try:
        sha = args.sha if args.sha else default_commit_sha(args.db)
        index = load_index(sha, args.db)
    except (FileNotFoundError, ValueError) as exc:  # includes UnknownCommitError
        print(f"error: {exc}", file=sys.stderr)  # clear message, no stack trace
        return 1

    for query in _read_queries(path):
        print(f"query: {query}")
        results = index.search(query, k=TOP_K)
        if not results:
            print("(no results)")
        for rank, r in enumerate(results, start=1):
            print(f"{rank} | {r.score:.3f} | {r.symbol} | {r.file}:{r.line_start}")
        print()  # blank line between queries
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
