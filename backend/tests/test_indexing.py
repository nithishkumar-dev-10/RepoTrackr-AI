import logging
from contextlib import contextmanager

import pytest
from sqlalchemy import select

from app import tasks
from app.models.repo import Repo
from app.pipeline.chunking.models import ChunkSet
from app.pipeline.clone.errors import CloneError
from app.pipeline.clone.models import CloneResult
from app.tasks import mark_stuck_repos_failed, run_index_pipeline

PASSWORD = "secret123"


def _auth_headers(client, sent_emails, email: str) -> dict[str, str]:
    client.post("/auth/signup", json={"email": email, "password": PASSWORD})
    raw_token = sent_emails[-1][1]
    client.post("/auth/verify-email", json={"token": raw_token})
    response = client.post(
        "/auth/login", json={"email": email, "password": PASSWORD}
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _create_repo(client, headers, url: str) -> int:
    response = client.post("/repos", json={"url": url}, headers=headers)
    assert response.status_code == 201
    return response.json()["id"]


@contextmanager
def _fake_clone(tmp_path, commit_sha: str = "abc123"):
    (tmp_path / "main.py").write_text(
        'def main() -> None:\n    return None\n\n\nif __name__ == "__main__":\n    main()\n',
        encoding="utf-8",
    )
    yield CloneResult(
        url="https://github.com/example/repo",
        path=tmp_path,
        commit_sha=commit_sha,
        size_bytes=100,
    )


def _fake_chunks(folder, commit_sha: str = "unknown", db_path=None) -> ChunkSet:
    return ChunkSet(commit_sha=commit_sha, files_parsed=1)


def test_start_index_runs_pipeline_and_populates_summary(
    client, sent_emails, db_session, tmp_path, monkeypatch, caplog
):
    headers = _auth_headers(client, sent_emails, "owner@example.com")
    repo_id = _create_repo(client, headers, "https://github.com/example/repo")
    seen_statuses: list[str] = []
    real_set_status = tasks._set_status

    def recording_set_status(db, repo, status, *, error_message=None):
        seen_statuses.append(status)
        return real_set_status(db, repo, status, error_message=error_message)

    monkeypatch.setattr("app.tasks._set_status", recording_set_status)
    monkeypatch.setattr(
        "app.tasks.clone_workspace", lambda url, config: _fake_clone(tmp_path)
    )
    monkeypatch.setattr("app.tasks.build_chunks", _fake_chunks)
    caplog.set_level(logging.INFO, logger="app")

    started = client.post(f"/repos/{repo_id}/index", headers=headers)

    assert started.status_code == 202
    assert started.json()["status"] == "queued"

    status_response = client.get(f"/repos/{repo_id}/index/status", headers=headers)
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "ready"
    assert status_response.json()["commit_sha"] == "abc123"
    assert status_response.json()["error_message"] is None

    summary_response = client.get(f"/repos/{repo_id}/index/summary", headers=headers)
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["commit_sha"] == "abc123"
    assert summary["total_symbols"] >= 1
    assert "main.py" in summary["file_tree"]
    assert summary["symbol_counts"]["function"] >= 1
    assert any(s["file"] == "main.py" and s["line_start"] > 0 for s in summary["symbols"])
    assert any("main.py" in entry for entry in summary["entry_points"])
    assert summary["files_parsed"] == 1
    assert seen_statuses == ["cloning", "indexing", "ready"]
    assert "per 10k LOC" in caplog.text

    db_session.expire_all()
    repo = db_session.scalar(select(Repo).where(Repo.id == repo_id))
    assert repo is not None
    assert repo.commit_sha == "abc123"
    assert repo.index_summary["commit_sha"] == "abc123"


def test_failed_clone_sets_failed_status_error_and_summary_conflict(
    client, sent_emails, db_session, monkeypatch
):
    headers = _auth_headers(client, sent_emails, "owner@example.com")
    repo_id = _create_repo(client, headers, "https://github.com/example/bad")

    @contextmanager
    def failing_clone(url, config):
        raise CloneError("invalid_url", "bad repo URL")
        yield  # pragma: no cover - unreachable, keeps contextmanager valid

    monkeypatch.setattr("app.tasks.clone_workspace", failing_clone)

    started = client.post(f"/repos/{repo_id}/index", headers=headers)
    assert started.status_code == 202

    status_response = client.get(f"/repos/{repo_id}/index/status", headers=headers)
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "failed"
    assert "[invalid_url] bad repo URL" in status_response.json()["error_message"]

    summary_response = client.get(f"/repos/{repo_id}/index/summary", headers=headers)
    assert summary_response.status_code == 409
    assert summary_response.json()["error"]["message"] == "Index is not ready."

    db_session.expire_all()
    repo = db_session.scalar(select(Repo).where(Repo.id == repo_id))
    assert repo is not None
    assert repo.status == "failed"
    assert repo.commit_sha is None


def test_second_start_is_rejected_while_running(client, sent_emails, monkeypatch):
    headers = _auth_headers(client, sent_emails, "owner@example.com")
    repo_id = _create_repo(client, headers, "https://github.com/example/running")
    monkeypatch.setattr(
        "app.features.indexing.router.run_index_pipeline", lambda repo_id: None
    )

    first = client.post(f"/repos/{repo_id}/index", headers=headers)
    assert first.status_code == 202
    assert first.json()["status"] == "queued"

    second = client.post(f"/repos/{repo_id}/index", headers=headers)
    assert second.status_code == 409
    assert "already queued" in second.json()["error"]["message"]


@pytest.mark.parametrize(
    "method,path",
    [
        ("post", "/index"),
        ("get", "/index/status"),
        ("get", "/index/summary"),
    ],
)
def test_index_endpoints_are_owner_only(
    client, sent_emails, monkeypatch, method, path
):
    owner_headers = _auth_headers(client, sent_emails, "owner@example.com")
    other_headers = _auth_headers(client, sent_emails, "other@example.com")
    repo_id = _create_repo(client, owner_headers, "https://github.com/example/owned")
    monkeypatch.setattr(
        "app.features.indexing.router.run_index_pipeline", lambda repo_id: None
    )

    response = client.request(
        method, f"/repos/{repo_id}{path}", headers=other_headers
    )

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "Repo not found"


def test_cache_hit_skips_clone_and_reparse(
    client, sent_emails, db_session, monkeypatch
):
    headers = _auth_headers(client, sent_emails, "owner@example.com")
    repo_id = _create_repo(client, headers, "https://github.com/example/cached")
    repo = db_session.scalar(select(Repo).where(Repo.id == repo_id))
    repo.status = "ready"
    repo.commit_sha = "same-sha"
    repo.index_summary = {"commit_sha": "same-sha", "symbols": []}
    db_session.commit()

    calls: list[str] = []

    def unexpected_clone(url, config):
        calls.append(url)
        raise AssertionError("cache hit must not clone")

    monkeypatch.setattr("app.tasks.clone_workspace", unexpected_clone)

    run_index_pipeline(repo_id)

    assert calls == []
    db_session.expire_all()
    cached = db_session.scalar(select(Repo).where(Repo.id == repo_id))
    assert cached is not None
    assert cached.status == "ready"
    assert cached.commit_sha == "same-sha"
    assert cached.index_summary == {"commit_sha": "same-sha", "symbols": []}


def test_reindex_through_endpoint_uses_cache(
    client, sent_emails, db_session, monkeypatch, caplog
):
    caplog.set_level("INFO", logger="app")
    headers = _auth_headers(client, sent_emails, "owner@example.com")
    repo_id = _create_repo(client, headers, "https://github.com/example/cached-http")
    repo = db_session.scalar(select(Repo).where(Repo.id == repo_id))
    repo.status = "ready"
    repo.commit_sha = "cached-sha"
    repo.index_summary = {"commit_sha": "cached-sha", "symbols": []}
    db_session.commit()

    calls: list[str] = []

    def unexpected_clone(url, config):
        calls.append(url)
        raise AssertionError("cache hit must not clone")

    monkeypatch.setattr("app.tasks.clone_workspace", unexpected_clone)

    started = client.post(f"/repos/{repo_id}/index", headers=headers)

    assert started.status_code == 202
    assert started.json()["status"] == "queued"
    status_response = client.get(f"/repos/{repo_id}/index/status", headers=headers)
    assert status_response.json()["status"] == "ready"
    assert status_response.json()["commit_sha"] == "cached-sha"
    assert calls == []
    assert "Index cache hit for repo" in caplog.text
    assert "cached-sha" in caplog.text


def test_summary_returns_conflict_before_ready(client, sent_emails):
    headers = _auth_headers(client, sent_emails, "owner@example.com")
    repo_id = _create_repo(client, headers, "https://github.com/example/waiting")

    response = client.get(f"/repos/{repo_id}/index/summary", headers=headers)

    assert response.status_code == 409
    assert response.json()["error"]["message"] == "Index is not ready."


def test_mark_stuck_repos_failed(client, sent_emails, db_session):
    headers = _auth_headers(client, sent_emails, "owner@example.com")
    repo_ids = [
        _create_repo(client, headers, f"https://github.com/example/stuck{i}")
        for i in range(3)
    ]
    repos = db_session.scalars(
        select(Repo).where(Repo.id.in_(repo_ids)).order_by(Repo.id)
    ).all()
    for repo, status in zip(repos, ["queued", "cloning", "indexing"]):
        repo.status = status
    db_session.commit()

    marked = mark_stuck_repos_failed()

    assert marked == 3
    db_session.expire_all()
    updated = db_session.scalars(
        select(Repo).where(Repo.id.in_(repo_ids))
    ).all()
    assert all(repo.status == "failed" for repo in updated)
    assert all(repo.error_message == tasks.INTERRUPTED_MESSAGE for repo in updated)
