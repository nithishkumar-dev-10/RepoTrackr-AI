"""Chunk a folder of Python code into retrievable pieces, cached by file hash.

Works purely on source text and the indexer's AST output — analyzed code is
never imported or executed.
"""

import hashlib
import logging
import os
import textwrap
from pathlib import Path

import tiktoken

from app.pipeline.chunking.models import MAX_TOKENS, Chunk, ChunkSet
from app.pipeline.chunking.store import ChunkStore
from app.pipeline.indexer.models import FileIndex, Symbol
from app.pipeline.indexer.parser import parse_source
from app.pipeline.indexer.repo import (
    IGNORED_DIRS,
    IGNORED_FILE_PREFIXES,
    IGNORED_FILE_SUFFIXES,
)

logger = logging.getLogger(__name__)

# Where the SQLite file lives unless the caller says otherwise.
DEFAULT_DB_PATH = Path(__file__).resolve().parents[3] / "data" / "chunks.db"

# The tokenizer is loaded once and reused; loading it per file is slow.
_encoding = None


def _tokens(text: str) -> int:
    """Token count with tiktoken's cl100k_base. Fails loudly, never fakes a number."""
    global _encoding
    if _encoding is None:
        try:
            _encoding = tiktoken.get_encoding("cl100k_base")
        except Exception as exc:  # offline or broken install
            raise RuntimeError(
                "tiktoken could not load the cl100k_base encoding, so token "
                "counts cannot be computed (are you offline?)"
            ) from exc
    return len(_encoding.encode(text))


# ------------------------------------------------------------------ file walk

def _python_files(folder: Path) -> list[Path]:
    """Every .py file under folder, with the indexer's ignore rules, sorted."""
    found: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(folder):
        dirnames[:] = [d for d in dirnames if d not in IGNORED_DIRS]  # prune in place
        for name in filenames:
            if not name.endswith(".py"):
                continue
            if name.startswith(IGNORED_FILE_PREFIXES) or name.endswith(IGNORED_FILE_SUFFIXES):
                continue
            found.append(Path(dirpath) / name)
    return sorted(found)  # os.walk order is arbitrary; sort for stable runs


# -------------------------------------------------------------- chunk making

def _header(file: str, line: int) -> str:
    """Comment line on top of every chunk, so a chunk names its own source."""
    return f"# {file}:{line}"


def _class_text(symbol: Symbol, file_symbols: list[Symbol]) -> str:
    """Class chunk: signature + docstring + the names of its methods.

    Method bodies are left out on purpose — they live in their own chunks, so
    no code is stored twice.
    """
    # Dotted path of the class, matching how the indexer records a method's parent.
    dotted = symbol.name if symbol.parent is None else f"{symbol.parent}.{symbol.name}"
    methods = [s.name for s in file_symbols if s.kind == "method" and s.parent == dotted]

    parts = [_header(symbol.file, symbol.line_start)]
    parts.append(f"class {symbol.name}{symbol.signature or ''}:")
    if symbol.docstring:
        parts.append(textwrap.indent(f'"""{symbol.docstring}"""', "    "))
    parts.append(f"    methods: {', '.join(methods) if methods else '(none)'}")
    return "\n".join(parts)


def _symbol_text(symbol: Symbol, source_lines: list[str], file_symbols: list[Symbol]) -> str:
    """Chunk text for one symbol: header line plus its source, or the class summary."""
    if symbol.kind == "class":
        return _class_text(symbol, file_symbols)
    body = "\n".join(source_lines[symbol.line_start - 1 : symbol.line_end])
    return f"{_header(symbol.file, symbol.line_start)}\n{body}"


def _file_chunks(fi: FileIndex, source: str, file_hash: str, commit_sha: str) -> list[Chunk]:
    """One chunk per function, class and method in one parsed file."""
    source_lines = source.splitlines()
    chunks: list[Chunk] = []
    for symbol in fi.symbols:
        text = _symbol_text(symbol, source_lines, fi.symbols)
        count = _tokens(text)
        chunks.append(
            Chunk(
                # line number in the id keeps same-named symbols apart
                id=f"{symbol.file}:{symbol.name}:{symbol.line_start}",
                name=symbol.name,
                kind=symbol.kind,
                file=symbol.file,
                line_start=symbol.line_start,
                line_end=symbol.line_end,
                text=text,
                token_count=count,
                file_hash=file_hash,
                commit_sha=commit_sha,
                too_large=count > MAX_TOKENS,  # flagged, never split
            )
        )
    return chunks


# -------------------------------------------------------------- build_chunks

def build_chunks(
    folder: str | Path,
    commit_sha: str = "unknown",
    db_path: str | Path | None = None,
) -> ChunkSet:
    """Chunk every .py file under folder and store the result in SQLite.

    Files whose sha256 content hash is already cached are not parsed again:
    their stored chunks are reused and re-keyed under the given commit SHA.
    """
    folder = Path(folder)
    store = ChunkStore(Path(db_path) if db_path else DEFAULT_DB_PATH)
    store.init_db()

    result = ChunkSet(commit_sha=commit_sha)
    for path in _python_files(folder):
        rel = path.relative_to(folder).as_posix()
        try:
            data = path.read_bytes()
        except OSError as exc:
            logger.warning("Could not read %s: %s", rel, exc)
            continue
        file_hash = hashlib.sha256(data).hexdigest()
        # Same decode rule as the indexer, so line numbers line up with its symbols.
        source = data.decode("utf-8", errors="replace")

        cached = store.get_cached(rel, file_hash)
        if cached is not None:
            chunks = [c.model_copy(update={"commit_sha": commit_sha}) for c in cached]
            result.files_cached += 1
        else:
            fi = parse_source(source, file_path=rel)
            if fi.parse_error:
                logger.warning("Skipping %s: %s", rel, fi.parse_error)
                result.files_skipped.append(rel)
                continue
            chunks = _file_chunks(fi, source, file_hash, commit_sha)
            result.files_parsed += 1

        store.save_file(rel, file_hash, chunks)
        result.chunks.extend(chunks)

    store.close()
    return result
