from sqlalchemy import select

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


def _create_repo(client, headers, url: str = "https://github.com/psf/requests"):
    return client.post("/repos", json={"url": url}, headers=headers)


# --- create ---


def test_create_repo_success(client, sent_emails):
    headers = _auth_headers(client, sent_emails, "a@example.com")

    response = _create_repo(client, headers, "https://github.com/psf/requests")

    assert response.status_code == 201
    body = response.json()
    assert body["url"] == "https://github.com/psf/requests"
    assert body["owner"] == "psf"
    assert body["name"] == "requests"
    assert body["status"] == "added"
    assert isinstance(body["id"], int)
    assert body["created_at"]


def test_create_repo_normalizes_url(client, sent_emails):
    headers = _auth_headers(client, sent_emails, "a@example.com")

    response = _create_repo(client, headers, "www.github.com/psf/requests.git/")

    assert response.status_code == 201
    assert response.json()["url"] == "https://github.com/psf/requests"


def test_create_repo_status_defaults_to_added(client, sent_emails, db_session):
    headers = _auth_headers(client, sent_emails, "a@example.com")

    _create_repo(client, headers)

    repo = db_session.scalar(select(Repo))
    assert repo is not None
    assert repo.status == "added"


def test_create_repo_invalid_url_returns_422(client, sent_emails):
    headers = _auth_headers(client, sent_emails, "a@example.com")

    response = _create_repo(client, headers, "https://github.com/psf")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_create_repo_non_github_url_returns_422(client, sent_emails):
    headers = _auth_headers(client, sent_emails, "a@example.com")

    response = _create_repo(client, headers, "https://gitlab.com/psf/requests")

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_create_repo_duplicate_returns_409(client, sent_emails):
    headers = _auth_headers(client, sent_emails, "a@example.com")

    assert _create_repo(client, headers).status_code == 201
    response = _create_repo(client, headers)

    assert response.status_code == 409
    assert response.json()["error"]["message"] == "Repo already added"


def test_create_repo_duplicate_different_case_returns_409(client, sent_emails):
    headers = _auth_headers(client, sent_emails, "a@example.com")

    assert _create_repo(
        client, headers, "https://github.com/psf/requests"
    ).status_code == 201
    response = _create_repo(client, headers, "https://github.com/PSF/Requests")

    assert response.status_code == 409
    assert response.json()["error"]["message"] == "Repo already added"


def test_create_repo_same_url_two_users_allowed(client, sent_emails):
    headers_a = _auth_headers(client, sent_emails, "a@example.com")
    headers_b = _auth_headers(client, sent_emails, "b@example.com")

    assert _create_repo(client, headers_a).status_code == 201
    assert _create_repo(client, headers_b).status_code == 201


# --- list ---


def test_list_repos_only_returns_my_repos(client, sent_emails):
    headers_a = _auth_headers(client, sent_emails, "a@example.com")
    headers_b = _auth_headers(client, sent_emails, "b@example.com")
    _create_repo(client, headers_a, "https://github.com/psf/requests")
    _create_repo(client, headers_b, "https://github.com/django/django")

    response = client.get("/repos", headers=headers_a)

    assert response.status_code == 200
    repos = response.json()["repos"]
    assert len(repos) == 1
    assert repos[0]["url"] == "https://github.com/psf/requests"


def test_list_repos_newest_first(client, sent_emails):
    headers = _auth_headers(client, sent_emails, "a@example.com")
    _create_repo(client, headers, "https://github.com/psf/requests")
    _create_repo(client, headers, "https://github.com/django/django")

    response = client.get("/repos", headers=headers)

    repos = response.json()["repos"]
    assert [repo["name"] for repo in repos] == ["django", "requests"]


# --- get ---


def test_get_own_repo(client, sent_emails):
    headers = _auth_headers(client, sent_emails, "a@example.com")
    repo_id = _create_repo(client, headers).json()["id"]

    response = client.get(f"/repos/{repo_id}", headers=headers)

    assert response.status_code == 200
    assert response.json()["id"] == repo_id


def test_get_another_users_repo_returns_404(client, sent_emails):
    headers_a = _auth_headers(client, sent_emails, "a@example.com")
    headers_b = _auth_headers(client, sent_emails, "b@example.com")
    repo_id = _create_repo(client, headers_b).json()["id"]

    response = client.get(f"/repos/{repo_id}", headers=headers_a)

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "Repo not found"


def test_get_nonexistent_repo_returns_404(client, sent_emails):
    headers = _auth_headers(client, sent_emails, "a@example.com")

    response = client.get("/repos/999999", headers=headers)

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "Repo not found"


# --- delete ---


def test_delete_own_repo(client, sent_emails):
    headers = _auth_headers(client, sent_emails, "a@example.com")
    repo_id = _create_repo(client, headers).json()["id"]

    response = client.delete(f"/repos/{repo_id}", headers=headers)

    assert response.status_code == 200
    assert response.json() == {"message": "Repo deleted."}
    assert client.get(f"/repos/{repo_id}", headers=headers).status_code == 404


def test_delete_another_users_repo_returns_404(client, sent_emails):
    headers_a = _auth_headers(client, sent_emails, "a@example.com")
    headers_b = _auth_headers(client, sent_emails, "b@example.com")
    repo_id = _create_repo(client, headers_b).json()["id"]

    response = client.delete(f"/repos/{repo_id}", headers=headers_a)

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "Repo not found"
    assert client.get(f"/repos/{repo_id}", headers=headers_b).status_code == 200


# --- auth required ---


def test_create_repo_requires_auth(client):
    response = client.post("/repos", json={"url": "https://github.com/psf/requests"})
    assert response.status_code == 401


def test_list_repos_requires_auth(client):
    assert client.get("/repos").status_code == 401


def test_get_repo_requires_auth(client):
    assert client.get("/repos/1").status_code == 401


def test_delete_repo_requires_auth(client):
    assert client.delete("/repos/1").status_code == 401
