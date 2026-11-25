"""Commit-SHA cache decisions for the indexing pipeline."""

import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover - imported only for static typing
    from app.models.repo import Repo


def summary_dict(repo: "Repo") -> dict:
    """Return the stored index summary as a dict, tolerating raw SQLite JSON."""
    summary = repo.index_summary
    if summary is None:
        return {}
    if isinstance(summary, dict):
        return summary
    if isinstance(summary, str):
        try:
            decoded = json.loads(summary)
        except (TypeError, ValueError):
            return {}
        return decoded if isinstance(decoded, dict) else {}
    return {}


def summary_commit_sha(repo: "Repo") -> str | None:
    """The commit the stored summary was produced for, if any."""
    sha = summary_dict(repo).get("commit_sha")
    return sha if isinstance(sha, str) and sha else None


def is_index_current(repo: "Repo") -> bool:
    """True when a ready repo already has a summary for its exact commit SHA.

    ``commit_sha`` is written right after a successful clone, so it is not enough
    on its own: a failed indexing run can leave a SHA behind without a usable
    summary. Both the SHA match and a stored summary are required.
    """
    return (
        repo.status == "ready"
        and bool(repo.commit_sha)
        and summary_commit_sha(repo) == repo.commit_sha
    )
