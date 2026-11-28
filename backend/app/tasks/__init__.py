"""Background work for the indexing pipeline.

The task in this module is the only bridge between the HTTP API and the
deterministic pipeline libraries. It never imports or executes analyzed code:
it reads source through the AST parser and stores only derived data.
"""

import logging
import os
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.models.repo import Repo
from app.pipeline.cache import is_index_current
from app.pipeline.chunking.builder import build_chunks
from app.pipeline.clone.cleanup import configured_clone_root, remove_clone
from app.pipeline.clone.clone import _destination
from app.pipeline.clone.redaction import redact_secrets
from app.pipeline.clone.errors import CloneError
from app.pipeline.clone.models import CloneConfig
from app.pipeline.clone.cleanup import clone_workspace
from app.pipeline.graph.builder import build_graph
from app.pipeline.indexer.repo import (
    IGNORED_DIRS,
    IGNORED_FILE_PREFIXES,
    IGNORED_FILE_SUFFIXES,
    index_repo,
)
from app.pipeline.indexer.models import RepoIndex

logger = logging.getLogger("app")

IN_PROGRESS_STATUSES = {"queued", "cloning", "indexing"}
INTERRUPTED_MESSAGE = "Indexing was interrupted by a server restart."


def _clone_config() -> CloneConfig:
    settings = get_settings()
    return CloneConfig(
        root=configured_clone_root(),
        max_size_mb=settings.CLONE_MAX_SIZE_MB,
        timeout_seconds=settings.CLONE_TIMEOUT_SECONDS,
    )


def _set_status(
    db: Session, repo: Repo, status: str, *, error_message: str | None = None
) -> None:
    repo.status = status
    repo.error_message = error_message
    db.commit()
    db.refresh(repo)


def _readable_error(exc: Exception) -> str:
    message = str(exc).strip()
    return (message or exc.__class__.__name__)[:2000]


def _discard_clone_dir(url: str, config: CloneConfig) -> None:
    """Best-effort cleanup when a clone fails before ``clone_workspace`` yields."""
    try:
        remove_clone(_destination(config.root, url), root=config.root)
    except (OSError, ValueError) as exc:
        logger.warning("Could not remove failed clone folder for %s: %s", url, exc)


def _file_tree(root: Path) -> list[str]:
    """All non-secret files in the clone, as sorted relative POSIX paths."""
    tree: list[str] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in IGNORED_DIRS)
        for name in sorted(filenames):
            if name.startswith(IGNORED_FILE_PREFIXES) or name.endswith(IGNORED_FILE_SUFFIXES):
                continue
            path = Path(dirpath) / name
            tree.append(path.relative_to(root).as_posix())
    return sorted(tree)


def _count_lines(root: Path, repo_index: RepoIndex) -> int:
    """Python source lines the indexer read, used for the per-10k-LOC metric."""
    total = 0
    for file_index in repo_index.files:
        path = root / file_index.file
        try:
            source = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        total += len(source.splitlines())
    return total


def _build_summary(
    *,
    root: Path,
    repo_index: RepoIndex,
    graph,
    chunks,
    commit_sha: str,
    elapsed_seconds: float,
    lines_of_code: int,
) -> dict:
    symbol_counts: dict[str, int] = {}
    for symbol in repo_index.symbols:
        symbol_counts[symbol.kind] = symbol_counts.get(symbol.kind, 0) + 1

    per_10k = (
        elapsed_seconds / lines_of_code * 10_000 if lines_of_code else 0.0
    )

    return {
        "commit_sha": commit_sha,
        "file_tree": _file_tree(root),
        "symbol_counts": symbol_counts,
        "total_symbols": len(repo_index.symbols),
        "modules": list(graph.reading_order),
        "entry_points": [
            f"{file_index.file}: {entry}"
            for file_index in repo_index.files
            for entry in file_index.entry_points
        ],
        "symbols": [
            {
                **symbol.model_dump(),
                "docstring": (
                    redact_secrets(symbol.docstring) if symbol.docstring else None
                ),
                "signature": (
                    redact_secrets(symbol.signature) if symbol.signature else None
                ),
            }
            for symbol in repo_index.symbols
        ],
        "files_indexed": len(repo_index.files),
        "files_parsed": chunks.files_parsed,
        "files_cached": chunks.files_cached,
        "files_skipped": list(chunks.files_skipped),
        "graph_node_count": len(graph.nodes),
        "graph_edge_count": len(graph.edges),
        # Full shape from build_graph() (builder.py), served by /repos/{id}/graph.
        "graph_nodes": [node.model_dump() for node in graph.nodes],
        "graph_edges": [edge.model_dump() for edge in graph.edges],
        "centrality": [score.model_dump() for score in graph.centrality],
        "lines_of_code": lines_of_code,
        "index_seconds": round(elapsed_seconds, 3),
        "seconds_per_10k_loc": round(per_10k, 3),
    }


def run_index_pipeline(repo_id: int) -> None:
    """Clone, index, graph and chunk one repo, then persist the result.

    A ready repo with a summary for the same commit SHA is a cache hit: no
    clone and no parse happen. Every other run clones into a scratch folder
    that is deleted on success or failure.
    """
    config = _clone_config()
    with SessionLocal() as db:
        repo = db.get(Repo, repo_id)
        if repo is None:
            logger.warning("Index task skipped: repo %d no longer exists", repo_id)
            return
        try:
            if is_index_current(repo):
                logger.info(
                    "Index cache hit for repo %d at %s", repo_id, repo.commit_sha
                )
                _set_status(db, repo, "ready", error_message=None)
                return

            _set_status(db, repo, "cloning", error_message=None)
            started = time.perf_counter()
            summary: dict

            with clone_workspace(repo.url, config) as clone:
                repo.commit_sha = clone.commit_sha
                db.commit()
                _set_status(db, repo, "indexing", error_message=None)

                repo_index = index_repo(clone.path)
                graph = build_graph(repo_index)
                chunks = build_chunks(clone.path, commit_sha=clone.commit_sha)

                elapsed = time.perf_counter() - started
                lines = _count_lines(clone.path, repo_index)
                summary = _build_summary(
                    root=clone.path,
                    repo_index=repo_index,
                    graph=graph,
                    chunks=chunks,
                    commit_sha=clone.commit_sha,
                    elapsed_seconds=elapsed,
                    lines_of_code=lines,
                )
                logger.info(
                    "Indexed repo %d: %d lines in %.3fs (%.3fs per 10k LOC)",
                    repo_id,
                    lines,
                    elapsed,
                    summary["seconds_per_10k_loc"],
                )

            repo.index_summary = summary
            _set_status(db, repo, "ready", error_message=None)
        except Exception as exc:
            db.rollback()
            _discard_clone_dir(repo.url, config)
            failed = db.get(Repo, repo_id)
            if failed is not None:
                failed.status = "failed"
                failed.error_message = _readable_error(exc)
                db.commit()
            logger.exception("Index pipeline failed for repo %d", repo_id)


def mark_stuck_repos_failed() -> int:
    """Fail repos left in an in-progress state by a process restart."""
    with SessionLocal() as db:
        result = db.execute(
            update(Repo)
            .where(Repo.status.in_(IN_PROGRESS_STATUSES))
            .values(status="failed", error_message=INTERRUPTED_MESSAGE)
        )
        db.commit()
        return result.rowcount or 0
