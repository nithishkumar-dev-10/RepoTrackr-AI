"""BM25 baseline retrieval over the chunks stored for one commit SHA.

Reads stored chunk rows from SQLite and never executes analyzed code.
"""

import keyword
import re
import sqlite3
from pathlib import Path

from rank_bm25 import BM25Okapi

from app.pipeline.chunking.models import Chunk
from app.pipeline.retrieval.models import SearchResult
from app.pipeline.retrieval.tokenizer import tokenize

# Same default location the chunking step writes to.
DEFAULT_DB_PATH = Path(__file__).resolve().parents[3] / "data" / "chunks.db"

# Names used in code: letters/underscore first, then letters/digits/underscores.
_IDENTIFIER = re.compile(r"[A-Za-z_][A-Za-z0-9_]+")

# Docstrings are delimited by triple quotes; take the first one in the chunk.
_DOCSTRING = re.compile(r'"""(.*?)"""', re.DOTALL)

# Python keywords are syntax, not names — "return" or "if" match every chunk.
_KEYWORDS = set(keyword.kwlist)


class UnknownCommitError(ValueError):
    """Raised when a commit SHA has no stored chunks in the database."""


def _docstring(text: str) -> str:
    """The prose inside the first triple-quoted string, or ""."""
    match = _DOCSTRING.search(text)
    return match.group(1) if match else ""


def _identifiers(body: str) -> str:
    """The names used in the body (function calls, variables), minus keywords."""
    return " ".join(m.group(0) for m in _IDENTIFIER.finditer(body) if m.group(0) not in _KEYWORDS)


def _index_text(chunk: Chunk) -> str:
    """The text one chunk is searched against.

    The symbol name is repeated 3 times so a query that spells the exact name
    outranks chunks that only mention the words once.
    """
    lines = chunk.text.splitlines()
    body = "\n".join(lines[1:]) if lines and lines[0].startswith("#") else chunk.text
    signature = body.splitlines()[0] if body else ""
    return " ".join(
        [chunk.name] * 3
        + [chunk.file, signature, _docstring(body), _identifiers(body)]
    )


class BM25Index:
    """A BM25 index over the chunks of exactly one commit."""

    def __init__(self, chunks: list[Chunk], commit_sha: str = "unknown"):
        self.commit_sha = commit_sha
        self.chunks = chunks  # position i in this list = BM25 document i
        corpus = [tokenize(_index_text(c)) for c in chunks]
        # BM25Okapi cannot be built from zero documents, so remember "empty".
        self._bm25 = BM25Okapi(corpus) if any(corpus) else None

    def __len__(self) -> int:
        return len(self.chunks)

    def search(self, query: str, k: int = 5) -> list[SearchResult]:
        """The k best-scoring chunks for `query`, best first. Never a crash."""
        tokens = tokenize(query)
        if not tokens or self._bm25 is None or k <= 0:
            return []  # empty query, empty index or k=0: nothing to rank
        scores = self._bm25.get_scores(tokens)
        # Sort by score descending; chunk id breaks ties so results are stable.
        ranked = sorted(
            range(len(self.chunks)),
            key=lambda i: (-float(scores[i]), self.chunks[i].id),
        )[:k]
        return [
            SearchResult(
                id=self.chunks[i].id,
                symbol=self.chunks[i].name,
                kind=self.chunks[i].kind,
                file=self.chunks[i].file,
                line_start=self.chunks[i].line_start,
                line_end=self.chunks[i].line_end,
                score=float(scores[i]),
                token_count=self.chunks[i].token_count,
            )
            for i in ranked
        ]


_LOAD_SQL = """
    SELECT chunk_id, name, kind, file, line_start, line_end,
           text, token_count, file_hash, commit_sha, too_large
    FROM chunks
    WHERE commit_sha = ?
    ORDER BY chunk_id
"""


def _query(db_path: Path, sql: str, params: tuple = ()) -> list[sqlite3.Row]:
    """Run one read query, with clear errors when the file/table is missing."""
    if not db_path.exists():
        raise FileNotFoundError(
            f"chunk database not found: {db_path} (run the chunking step first)"
        )
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        return conn.execute(sql, params).fetchall()
    except sqlite3.OperationalError as exc:  # file exists but has no chunks table
        raise FileNotFoundError(
            f"no chunks table in {db_path} (run the chunking step first)"
        ) from exc
    finally:
        conn.close()


def load_index(commit_sha: str, db_path: str | Path | None = None) -> BM25Index:
    """Build the BM25 index for one commit SHA from stored chunks."""
    path = Path(db_path) if db_path else DEFAULT_DB_PATH
    rows = _query(path, _LOAD_SQL, (commit_sha,))
    if not rows:
        raise UnknownCommitError(
            f"commit {commit_sha!r} has no chunks in {path} (known commits can be "
            "listed with: sqlite3 data/chunks.db \"SELECT DISTINCT commit_sha FROM chunks\")"
        )
    chunks = [
        Chunk(
            id=row["chunk_id"], name=row["name"], kind=row["kind"], file=row["file"],
            line_start=row["line_start"], line_end=row["line_end"], text=row["text"],
            token_count=row["token_count"], file_hash=row["file_hash"],
            commit_sha=row["commit_sha"], too_large=bool(row["too_large"]),
        )
        for row in rows
    ]
    return BM25Index(chunks, commit_sha=commit_sha)


def default_commit_sha(db_path: str | Path | None = None) -> str:
    """The commit SHA with the most stored chunks, used when none is given."""
    path = Path(db_path) if db_path else DEFAULT_DB_PATH
    rows = _query(
        path,
        "SELECT commit_sha FROM chunks "
        "GROUP BY commit_sha ORDER BY COUNT(*) DESC LIMIT 1",
    )
    if not rows:
        raise UnknownCommitError(
            f"chunk database {path} is empty (no chunks stored yet)"
        )
    return rows[0]["commit_sha"]
