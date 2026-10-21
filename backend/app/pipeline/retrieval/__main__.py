"""Command line entry point:
python -m app.pipeline.retrieval "<query>" [--k 5] [--sha SHA] [--db PATH]

Prints the commit searched and the top-k chunks, best first.
"""

import argparse
import sys

from app.pipeline.retrieval import (
    DEFAULT_DB_PATH,
    default_commit_sha,
    load_index,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m app.pipeline.retrieval",
        description="Search one commit's chunks with the BM25 baseline.",
    )
    parser.add_argument("query", help="words to search for")
    parser.add_argument("--k", type=int, default=5, help="how many results (default: 5)")
    parser.add_argument(
        "--sha",
        default=None,
        help="commit SHA to search (default: the SHA with the most chunks in the DB)",
    )
    parser.add_argument("--db", default=None, help=f"SQLite path (default: {DEFAULT_DB_PATH})")
    args = parser.parse_args(argv)

    try:
        sha = args.sha if args.sha else default_commit_sha(args.db)
        index = load_index(sha, args.db)
    except (FileNotFoundError, ValueError) as exc:  # includes UnknownCommitError
        print(f"error: {exc}", file=sys.stderr)  # clear message, no stack trace
        return 1

    results = index.search(args.query, k=args.k)
    print(f"commit: {index.commit_sha}")
    print(f"results: {len(results)}")
    for rank, r in enumerate(results, start=1):
        print(f"{rank} | {r.score:.3f} | {r.symbol} | {r.file}:{r.line_start}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
