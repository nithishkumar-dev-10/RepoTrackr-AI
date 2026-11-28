"""Command line entry point: python -m app.pipeline.indexer <folder>

Prints one row per symbol as "kind | name | file:line", then a summary.
"""

import argparse

from app.pipeline.indexer.repo import index_repo


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m app.pipeline.indexer",
        description="Index a folder of Python code into symbols with file:line locations.",
    )
    parser.add_argument("folder", help="folder to index")
    args = parser.parse_args(argv)

    repo = index_repo(args.folder)

    # Symbol table, ordered by file then line so it reads like the source.
    print(f"{'kind':<10} | {'name':<40} | file:line")
    print("-" * 72)
    for symbol in sorted(repo.symbols, key=lambda s: (s.file, s.line_start)):
        print(f"{symbol.kind:<10} | {symbol.name:<40} | {symbol.file}:{symbol.line_start}")

    parsed = sum(1 for f in repo.files if f.parse_error is None)
    skipped = len(repo.files) - parsed
    entry_points = sum(len(f.entry_points) for f in repo.files)
    test_files = sum(1 for f in repo.files if f.is_test)

    print()
    print("summary:")
    print(f"  files parsed:  {parsed}")
    print(f"  files skipped: {skipped}")
    print(f"  symbols:       {len(repo.symbols)}")
    print(f"  entry points:  {entry_points}")
    print(f"  test files:    {test_files}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
