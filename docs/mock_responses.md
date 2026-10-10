# Mock Responses

Ready-to-use JSON for the frontend team. Grouped by endpoint, with success and error examples. The error envelope is identical everywhere; only `code`/`message`/`details` change. See `docs/api_contract.md` for the field rules.

Common error envelope:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      { "type": "value_error", "loc": ["body", "password"], "msg": "Value error, Password must contain at least one digit", "input": "abcdefgh" }
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
Error `409` (email already registered):
```json
{ "error": { "code": "http_error", "message": "Email is already registered", "details": null } }
```
Error `422` (weak password / bad email):
```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      { "type": "value_error", "loc": ["body", "password"], "msg": "Value error, Password must be at least 8 characters long", "input": "abc1" }
    ]
  }
}
```
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
Error `401` (bad credentials):
```json
{ "error": { "code": "http_error", "message": "Invalid email or password", "details": null } }
```
Error `403` (email not verified):
```json
{ "error": { "code": "http_error", "message": "Email not verified. Please verify your email before logging in.", "details": null } }
```

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
      { "type": "value_error", "loc": ["body", "url"], "msg": "Value error, Only public GitHub URLs (github.com/owner/name) are supported", "input": "https://gitlab.com/psf/requests" }
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

## Parts 2–4 stubs (not_implemented)

Every Part 2–4 endpoint currently returns `501` with:
```json
{ "status": "not_implemented" }
```
Applies to: `POST /repos/{repo_id}/index`, `GET /repos/{repo_id}/index/status`, `GET /repos/{repo_id}/index/summary`, `POST /repos/{repo_id}/plan`, `GET /repos/{repo_id}/plan`, `GET /repos/{repo_id}/reader`, `POST /repos/{repo_id}/context`, `POST /repos/{repo_id}/query`, `GET /repos/{repo_id}/agent/trace`, `GET /evals`.

---

## System

### GET /health

Success `200`:
```json
{ "status": "ok" }
```
