"""Tests for GET /repos/{repo_id}/graph served from the deterministic graph."""

from sqlalchemy import select

from app.features.indexing.graph_out import MAX_NODES
from app.models.repo import Repo

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


def _set_ready(db_session, repo_id: int, summary: dict) -> None:
    db_session.expire_all()
    repo = db_session.scalar(select(Repo).where(Repo.id == repo_id))
    assert repo is not None
    repo.status = "ready"
    repo.index_summary = summary
    db_session.commit()


def _summary() -> dict:
    return {
        "commit_sha": "abc123",
        "file_tree": ["main.py", "pkg/util.py"],
        "symbol_counts": {"function": 1},
        "total_symbols": 1,
        "modules": ["main.py", "pkg/util.py"],
        "entry_points": ["main.py: main"],
        "symbols": [
            {
                "name": "main",
                "kind": "function",
                "file": "main.py",
                "line_start": 3,
                "line_end": 4,
                "signature": None,
                "docstring": None,
                "parent": None,
            }
        ],
        "graph_nodes": [
            {"id": "main.py", "kind": "module", "label": "main.py", "file": "main.py"},
            {
                "id": "pkg/util.py",
                "kind": "module",
                "label": "pkg/util.py",
                "file": "pkg/util.py",
            },
            {
                "id": "main.py:main",
                "kind": "symbol",
                "label": "main.py:main",
                "file": "main.py",
            },
        ],
        "graph_edges": [
            {"source": "main.py", "target": "main.py:main", "kind": "call"},
            {"source": "main.py", "target": "pkg/util.py", "kind": "import"},
        ],
        "centrality": [
            {"module": "main.py", "in_degree": 0, "pagerank": 0.5, "score": 0.5},
            {"module": "pkg/util.py", "in_degree": 1, "pagerank": 0.5, "score": 1.0},
        ],
    }


def test_graph_endpoint_returns_frontend_shape(client, sent_emails, db_session):
    headers = _auth_headers(client, sent_emails, "owner@example.com")
    repo_id = _create_repo(client, headers, "https://github.com/example/graph")
    _set_ready(db_session, repo_id, _summary())

    response = client.get(f"/repos/{repo_id}/graph", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["truncated"] is False
    assert {node["id"] for node in body["nodes"]} == {
        "main.py",
        "pkg/util.py",
        "main.py:main",
    }
    main = next(node for node in body["nodes"] if node["id"] == "main.py")
    assert main["kind"] == "module"
    assert main["cluster"] == "root"
    assert main["isEntry"] is True
    assert main["line"] == 1
    assert 0 <= main["centrality"] <= 1

    symbol = next(node for node in body["nodes"] if node["id"] == "main.py:main")
    assert symbol["kind"] == "function"
    assert symbol["line"] == 3
    assert symbol["isEntry"] is True

    util = next(node for node in body["nodes"] if node["id"] == "pkg/util.py")
    assert util["cluster"] == "pkg"

    assert {(edge["source"], edge["target"], edge["type"]) for edge in body["edges"]} == {
        ("main.py", "main.py:main", "call"),
        ("main.py", "pkg/util.py", "import"),
    }
    assert {cluster["id"] for cluster in body["clusters"]} == {"root", "pkg"}


def test_graph_endpoint_rejects_not_ready_repo(client, sent_emails, db_session):
    headers = _auth_headers(client, sent_emails, "owner@example.com")
    repo_id = _create_repo(client, headers, "https://github.com/example/notready")

    response = client.get(f"/repos/{repo_id}/graph", headers=headers)

    assert response.status_code == 409
    assert response.json()["error"]["message"] == "Index is not ready."


def test_graph_endpoint_is_owner_only(client, sent_emails, db_session):
    owner_headers = _auth_headers(client, sent_emails, "owner@example.com")
    other_headers = _auth_headers(client, sent_emails, "other@example.com")
    repo_id = _create_repo(client, owner_headers, "https://github.com/example/owned")
    _set_ready(db_session, repo_id, _summary())

    response = client.get(f"/repos/{repo_id}/graph", headers=other_headers)

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "Repo not found"


def test_graph_endpoint_requires_auth(client, sent_emails, db_session):
    headers = _auth_headers(client, sent_emails, "owner@example.com")
    repo_id = _create_repo(client, headers, "https://github.com/example/auth")
    _set_ready(db_session, repo_id, _summary())

    response = client.get(f"/repos/{repo_id}/graph")

    assert response.status_code == 401


def test_graph_endpoint_caps_nodes_and_marks_truncated(client, sent_emails, db_session):
    headers = _auth_headers(client, sent_emails, "owner@example.com")
    repo_id = _create_repo(client, headers, "https://github.com/example/large")
    summary = _summary()
    summary["graph_nodes"] += [
        {
            "id": f"mod{i}.py",
            "kind": "module",
            "label": f"mod{i}.py",
            "file": f"mod{i}.py",
        }
        for i in range(MAX_NODES)
    ]
    summary["graph_edges"] += [
        {
            "source": f"mod{i}.py",
            "target": "main.py",
            "kind": "import",
        }
        for i in range(MAX_NODES)
    ]
    _set_ready(db_session, repo_id, summary)

    response = client.get(f"/repos/{repo_id}/graph", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["truncated"] is True
    assert len(body["nodes"]) == MAX_NODES
    node_ids = {node["id"] for node in body["nodes"]}
    assert all(
        edge["source"] in node_ids and edge["target"] in node_ids
        for edge in body["edges"]
    )
