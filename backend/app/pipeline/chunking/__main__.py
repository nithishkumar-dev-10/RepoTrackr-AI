"""Command line entry point: python -m app.pipeline.chunking <folder> [--sha SHA]

Prints chunk totals, timing, and the largest chunks of the run.
"""

import argparse
import time

from app.pipeline.chunking.builder import DEFAULT_DB_PATH, build_chunks


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m app.pipeline.chunking",
        description="Chunk a folder of Python code and store the chunks in SQLite.",
    )
    parser.add_argument("folder", help="folder to chunk")
    parser.add_argument("--sha", default="unknown", help="commit SHA to key the chunks by")
    parser.add_argument("--db", default=None, help=f"SQLite path (default: {DEFAULT_DB_PATH})")
    args = parser.parse_args(argv)

    started = time.perf_counter()
    result = build_chunks(args.folder, commit_sha=args.sha, db_path=args.db)
    elapsed = time.perf_counter() - started

    print(f"commit: {result.commit_sha}")
    print(f"chunks: {len(result.chunks)}")
    print(f"tokens: {result.total_tokens}")
    print(
        f"files: {result.files_parsed} parsed, {result.files_cached} from cache, "
        f"{len(result.files_skipped)} skipped (syntax errors)"
    )
    print(f"time: {elapsed:.2f}s")

    largest = sorted(result.chunks, key=lambda c: -c.token_count)[:3]
    print("\nlargest chunks:")
    for chunk in largest:
        flag = "  [too_large]" if chunk.too_large else ""
        print(f"  {chunk.id}  {chunk.token_count} tokens{flag}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
