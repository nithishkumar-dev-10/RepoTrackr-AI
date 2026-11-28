# Mock Responses

Ready-to-use JSON for the frontend team. Grouped by endpoint, with success and error examples. The error envelope is identical everywhere; only `code`/`message`/`details` change. See `docs/api_contract.md` for the field rules.

Common error envelope:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      { "type": "value_error", "loc": ["body", "password"], "msg": "Value error, Password must contain at least one digit" }
    ]
  }
}
```

---

## Auth

### POST /auth/signup

Request:
```json
{ "email": "user@example.com", "password": "secret123" }
```
Success `201`:
```json
{ "message": "Account created. Check your email to verify your account." }
```
Duplicate email returns the **same neutral 201** body and sends a fresh verification email; it never returns 409. Unknown/duplicate accounts are indistinguishable from the response.
Error `422` (weak password / bad email):
```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      { "type": "value_error", "loc": ["body", "password"], "msg": "Value error, Password must be at least 8 characters long" }
    ]
  }
}
```
`details` never includes the submitted `input` or the validator `ctx`.
Error `429` (rate limited):
```json
{ "error": { "code": "http_error", "message": "Too many requests", "details": null } }
```

### POST /auth/verify-email

Request:
```json
{ "token": "eyJhbGciOi..." }
```
Success `200`:
```json
{ "message": "Email verified. You can now log in." }
```
Error `400` (invalid/expired/used):
```json
{ "error": { "code": "http_error", "message": "Invalid or expired verification token", "details": null } }
```

### POST /auth/resend-verification

Request:
```json
{ "email": "user@example.com" }
```
Success `200`:
```json
{ "message": "If the account exists and is unverified, a new verification email has been sent." }
```
Error `422`:
```json
{ "error": { "code": "validation_error", "message": "Request validation failed", "details": [] } }
```

### POST /auth/login

Request:
```json
{ "email": "user@example.com", "password": "secret123" }
```
Success `200`:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh...",
  "token_type": "bearer"
}
```
Error `401` (unknown email or wrong password):
```json
{ "error": { "code": "http_error", "message": "Invalid email or password", "details": null } }
```
Error `401` (existing account, correct password, email not verified — same status and message, distinct code):
```json
{ "error": { "code": "email_not_verified", "message": "Invalid email or password", "details": null } }
```
The frontend maps `code == "email_not_verified"` to "Please verify your email before logging in."; no `403` is returned for this case.

### POST /auth/refresh

Request:
```json
{ "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh..." }
```
Success `200`:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh...",
  "token_type": "bearer"
}
```
Error `401` (bad/expired refresh token):
```json
{ "error": { "code": "http_error", "message": "Invalid or expired refresh token", "details": null } }
```

### POST /auth/logout

Request: none. Header: `Authorization: Bearer <access_token>`
Success `200`:
```json
{ "message": "Logged out." }
```
Error `401`:
```json
{ "error": { "code": "http_error", "message": "Not authenticated", "details": null } }
```

### GET /auth/me

Request: none. Header: `Authorization: Bearer <access_token>`
Success `200`:
```json
{
  "id": 1,
  "email": "user@example.com",
  "is_verified": true,
  "created_at": "2026-10-10T12:00:00Z"
}
```
Error `401`:
```json
{ "error": { "code": "http_error", "message": "Not authenticated", "details": null } }
```

### POST /auth/forgot-password

Request:
```json
{ "email": "user@example.com" }
```
Success `200` (same whether or not the email exists):
```json
{ "message": "If an account exists for that email, a password reset link has been sent." }
```

### POST /auth/reset-password

Request:
```json
{ "token": "eyJhbGciOi...", "new_password": "newsecret123" }
```
Success `200`:
```json
{ "message": "Password has been reset. You can now log in." }
```
Error `400` (invalid/expired/used token):
```json
{ "error": { "code": "http_error", "message": "Invalid or expired reset token", "details": null } }
```

### POST /auth/change-password

Request:
```json
{ "current_password": "secret123", "new_password": "newsecret123" }
```
Header: `Authorization: Bearer <access_token>`
Success `200`:
```json
{ "message": "Password changed." }
```
Error `400` (wrong current password):
```json
{ "error": { "code": "http_error", "message": "Current password is incorrect", "details": null } }
```

### DELETE /auth/account

Request: none. Header: `Authorization: Bearer <access_token>`
Success `200`:
```json
{ "message": "Account deleted." }
```
Error `401`:
```json
{ "error": { "code": "http_error", "message": "Not authenticated", "details": null } }
```

---

## Repos

### POST /repos

Request:
```json
{ "url": "https://github.com/psf/requests" }
```
Header: `Authorization: Bearer <access_token>`
Success `201`:
```json
{
  "id": 10,
  "url": "https://github.com/psf/requests",
  "owner": "psf",
  "name": "requests",
  "status": "added",
  "created_at": "2026-10-10T12:05:00Z"
}
```
Error `409` (already added):
```json
{ "error": { "code": "http_error", "message": "Repo already added", "details": null } }
```
Error `422` (not a public GitHub URL):
```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      { "type": "value_error", "loc": ["body", "url"], "msg": "Value error, Only public GitHub URLs (github.com/owner/name) are supported" }
    ]
  }
}
```

### GET /repos

Request: none. Header: `Authorization: Bearer <access_token>`
Success `200` (empty state shown too):
```json
{
  "repos": [
    {
      "id": 10,
      "url": "https://github.com/psf/requests",
      "owner": "psf",
      "name": "requests",
      "status": "added",
      "created_at": "2026-10-10T12:05:00Z"
    }
  ]
}
```
```json
{ "repos": [] }
```

### GET /repos/{repo_id}

Success `200`:
```json
{
  "id": 10,
  "url": "https://github.com/psf/requests",
  "owner": "psf",
  "name": "requests",
  "status": "added",
  "created_at": "2026-10-10T12:05:00Z"
}
```
Error `404`:
```json
{ "error": { "code": "http_error", "message": "Repo not found", "details": null } }
```

### DELETE /repos/{repo_id}

Success `200`:
```json
{ "message": "Repo deleted." }
```
Error `404`:
```json
{ "error": { "code": "http_error", "message": "Repo not found", "details": null } }
```

---

## Part 2 — indexing (live)

All routes require `Authorization: Bearer <access_token>` and ownership of the repo (401 without a token, 404 for a foreign/missing repo).

### POST /repos/{repo_id}/index
Success `202`:
```json
{ "status": "queued", "message": "Indexing queued." }
```
Error `409` (already queued/cloning/indexing):
```json
{ "error": { "code": "http_error", "message": "Indexing is already indexing for this repo.", "details": null } }
```

### GET /repos/{repo_id}/index/status
Success `200`:
```json
{ "status": "ready", "commit_sha": "abc123", "error_message": null }
```
Error `409` on `/index/summary` or `/graph` before `ready`:
```json
{ "error": { "code": "http_error", "message": "Index is not ready.", "details": null } }
```

### GET /repos/{repo_id}/index/summary
Success `200` (abridged; full field list in `docs/api_contract.md`):
```json
{
  "commit_sha": "abc123",
  "file_tree": ["main.py", "pkg/util.py"],
  "symbol_counts": { "function": 1 },
  "total_symbols": 1,
  "modules": ["main.py", "pkg/util.py"],
  "entry_points": ["main.py: main"],
  "symbols": [
    { "name": "main", "kind": "function", "file": "main.py", "line_start": 3, "line_end": 4, "signature": null, "docstring": null, "parent": null }
  ],
  "graph_node_count": 3,
  "graph_edge_count": 2,
  "graph_nodes": [
    { "id": "main.py", "kind": "module", "label": "main.py", "file": "main.py" },
    { "id": "main.py:main", "kind": "symbol", "label": "main.py:main", "file": "main.py" }
  ],
  "graph_edges": [
    { "source": "main.py", "target": "main.py:main", "kind": "call" }
  ],
  "centrality": [
    { "module": "main.py", "in_degree": 0, "pagerank": 0.5, "score": 0.5 }
  ],
  "lines_of_code": 42,
  "index_seconds": 1.2,
  "seconds_per_10k_loc": 285.7
}
```

### GET /repos/{repo_id}/graph
Success `200` — the frontend `Graph` shape mapped from the stored deterministic graph; capped at 300 nodes / 1000 edges with `truncated`:
```json
{
  "nodes": [
    { "id": "main.py", "label": "main.py", "kind": "module", "cluster": "root", "centrality": 1.0, "file": "main.py", "line": 1, "isEntry": true },
    { "id": "main.py:main", "label": "main.py:main", "kind": "function", "cluster": "root", "centrality": 0.5, "file": "main.py", "line": 3, "isEntry": true }
  ],
  "edges": [
    { "source": "main.py", "target": "main.py:main", "type": "call" }
  ],
  "clusters": [{ "id": "root", "label": "root" }],
  "truncated": false
}
```
The frontend uses this route by default; set `VITE_USE_MOCKS=true` to use `src/mock/*` graph data for demos.

---

## Parts 3–4 stubs (not_implemented)

Every remaining Part 3–4 endpoint returns `501` with:
```json
{ "status": "not_implemented" }
```
Applies to: `POST /repos/{repo_id}/plan`, `GET /repos/{repo_id}/plan`, `GET /repos/{repo_id}/reader`, `POST /repos/{repo_id}/context`, `POST /repos/{repo_id}/query`, `GET /repos/{repo_id}/agent/trace`, `GET /evals`. The frontend falls back to typed local mock data for these and labels it "Not implemented yet".

---

## System

### GET /health

Success `200`:
```json
{ "status": "ok" }
```
