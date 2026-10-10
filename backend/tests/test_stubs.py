import pytest

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


def _create_repo(client, headers, url: str = "https://github.com/psf/requests") -> int:
    response = client.post("/repos", json={"url": url}, headers=headers)
    assert response.status_code == 201
    return response.json()["id"]


_QUERY_BODY = {"json": {"query": "where do I start?", "mode": "reader"}}
_PLAN_UPLOAD = {
    "files": {"file": ("roadmap.yaml", b"items: []", "application/x-yaml")}
}

# (method, path template, extra request kwargs)
_STUB_CASES = [
    ("post", "/repos/{repo_id}/index", {}),
    ("get", "/repos/{repo_id}/index/status", {}),
    ("get", "/repos/{repo_id}/index/summary", {}),
    ("post", "/repos/{repo_id}/plan", _PLAN_UPLOAD),
    ("get", "/repos/{repo_id}/plan", {}),
    ("get", "/repos/{repo_id}/reader", {}),
    ("post", "/repos/{repo_id}/context", _QUERY_BODY),
    ("post", "/repos/{repo_id}/query", _QUERY_BODY),
    ("get", "/repos/{repo_id}/agent/trace", {}),
]


def _call(client, method: str, path: str, headers=None, **extra):
    return client.request(method.upper(), path, headers=headers, **extra)


@pytest.mark.parametrize("method,path,extra", _STUB_CASES)
def test_stub_returns_not_implemented(client, sent_emails, method, path, extra):
    headers = _auth_headers(client, sent_emails, "a@example.com")
    repo_id = _create_repo(client, headers)

    response = _call(client, method, path.format(repo_id=repo_id), headers=headers, **extra)

    assert response.status_code == 501
    assert response.json() == {"status": "not_implemented"}


@pytest.mark.parametrize("method,path,extra", _STUB_CASES)
def test_stub_requires_auth(client, method, path, extra):
    response = _call(client, method, path.format(repo_id=1), **extra)

    assert response.status_code == 401


@pytest.mark.parametrize("method,path,extra", _STUB_CASES)
def test_stub_another_users_repo_returns_404(client, sent_emails, method, path, extra):
    headers_a = _auth_headers(client, sent_emails, "a@example.com")
    headers_b = _auth_headers(client, sent_emails, "b@example.com")
    repo_id = _create_repo(client, headers_b)

    response = _call(client, method, path.format(repo_id=repo_id), headers=headers_a, **extra)

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "Repo not found"


def test_stub_nonexistent_repo_returns_404(client, sent_emails):
    headers = _auth_headers(client, sent_emails, "a@example.com")

    response = client.get("/repos/999999/index/status", headers=headers)

    assert response.status_code == 404


def test_evals_stub_returns_not_implemented_without_auth(client):
    response = client.get("/evals")

    assert response.status_code == 501
    assert response.json() == {"status": "not_implemented"}
