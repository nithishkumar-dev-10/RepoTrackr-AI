"""SQLite storage for chunks, plus the file-hash cache that avoids re-parsing."""

import json
import sqlite3
from pathlib import Path

from app.pipeline.chunking.models import Chunk


class ChunkStore:
    """Two tables in one SQLite file:

    chunks     — every chunk, keyed by (commit_sha, chunk_id), so each commit
                 gets its own full copy of the chunk set.
    file_cache — one row per (file, content hash) holding that file's chunks as
                 JSON. A re-run hashes each file and reuses the row on a match
                 instead of parsing the file again. The path is part of the key
                 because two different files can hold identical bytes.
    """

    def __init__(self, db_path: str | Path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)  # backend/data/ may not exist yet
        self.conn = sqlite3.connect(self.db_path)

    def init_db(self) -> None:
        self.conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS chunks (
                commit_sha  TEXT NOT NULL,
                chunk_id    TEXT NOT NULL,
                file        TEXT NOT NULL,
                name        TEXT NOT NULL,
                kind        TEXT NOT NULL,
                line_start  INTEGER NOT NULL,
                line_end    INTEGER NOT NULL,
                text        TEXT NOT NULL,
                token_count INTEGER NOT NULL,
                too_large   INTEGER NOT NULL,
                file_hash   TEXT NOT NULL,
                PRIMARY KEY (commit_sha, chunk_id)
            );
            CREATE TABLE IF NOT EXISTS file_cache (
                file        TEXT NOT NULL,
                file_hash   TEXT NOT NULL,
                chunks_json TEXT NOT NULL,
                PRIMARY KEY (file, file_hash)
            );
            """
        )
        self.conn.commit()

    def get_cached(self, file: str, file_hash: str) -> list[Chunk] | None:
        """The chunks stored for this exact file + content, or None on a miss."""
        row = self.conn.execute(
            "SELECT chunks_json FROM file_cache WHERE file = ? AND file_hash = ?",
            (file, file_hash),
        ).fetchone()
        return None if row is None else [Chunk(**item) for item in json.loads(row[0])]

    def save_file(self, file: str, file_hash: str, chunks: list[Chunk]) -> None:
        """Store one file's chunks under the current commit, then refresh its cache row."""
        self.conn.executemany(
            "INSERT OR REPLACE INTO chunks VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            [
                (
                    c.commit_sha, c.id, c.file, c.name, c.kind, c.line_start,
                    c.line_end, c.text, c.token_count, int(c.too_large), c.file_hash,
                )
                for c in chunks
            ],
        )
        payload = json.dumps([c.model_dump() for c in chunks])
        self.conn.execute(
            "INSERT OR REPLACE INTO file_cache (file, file_hash, chunks_json) VALUES (?,?,?)",
            (file, file_hash, payload),
        )
        self.conn.commit()  # commit per file: a crash mid-run keeps what was saved

    def close(self) -> None:
        self.conn.close()
