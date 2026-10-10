# API Contract

The HTTP contract for RepoTrackr AI. **Part 1** endpoints are the current build; **Parts 2–4** endpoints are declared here so the frontend can wire them now but return `{"status": "not_implemented"}` until built.

## Conventions

- **Base URL (dev):** `http://127.0.0.1:8000`
- **Auth:** protected routes require `Authorization: Bearer <access_token>`. Access tokens are short-lived; use `POST /auth/refresh` with the refresh token to get a new pair.
- **Content type:** `application/json` unless noted.
- **IDs:** integer (`int`), path params are `{repo_id}`.
- **Timestamps:** ISO 8601 UTC (e.g. `2026-10-10T12:00:00Z`).

### Success shape

Each endpoint's success body is the schema named in the table. Lists are wrapped objects (e.g. `RepoListOut`), not bare arrays.

### Error shape

Every error returns the same envelope (defined in `backend/app/schemas/common.py`):

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": []
  }
}
```

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `http_error` | Bad/expired/used token or malformed request logic |
| 401 | `http_error` | Missing/invalid credentials or token |
| 403 | `http_error` | Authenticated but not allowed (e.g. email not verified) |
| 404 | `http_error` | Resource not found |
| 409 | `http_error` | Conflict (duplicate email or duplicate repo) |
| 422 | `validation_error` | Request body/params failed validation (`details` holds the field errors) |
| 429 | `http_error` | Rate limit exceeded |
| 500 | `internal_error` | Unhandled server error |

### Password rule (schema `auth.py`)

Validated on `SignupRequest`, `ResetPasswordRequest.new_password`, `ChangePasswordRequest.new_password`:

- at least **8 characters** (`PASSWORD_MIN_LENGTH`)
- at least **one letter**
- at least **one digit**

### Repo URL rule (schema `repo.py`)

`RepoCreate.url` must be a public GitHub URL of the form `github.com/owner/name`. Accepted: with/without scheme, `www.`, trailing slash, and `.git` suffix. It is normalized to `https://github.com/owner/name`; `owner` and `name` are derived (not sent by the client).

---

## Part 1 — Implemented

### Auth

| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/auth/signup` | no | `SignupRequest` | 201 `MessageResponse` | 422, 409, 429 |
| POST | `/auth/verify-email` | no | `VerifyEmailRequest` | 200 `MessageResponse` | 400, 422 |
| POST | `/auth/resend-verification` | no | `ResendVerificationRequest` | 200 `MessageResponse` | 422, 429 |
| POST | `/auth/login` | no | `LoginRequest` | 200 `TokenResponse` | 401, 403, 422, 429 |
| POST | `/auth/refresh` | no | `RefreshRequest` | 200 `TokenResponse` | 401, 422 |
| POST | `/auth/logout` | yes | — | 200 `MessageResponse` | 401 |
| GET | `/auth/me` | yes | — | 200 `UserOut` | 401 |
| POST | `/auth/forgot-password` | no | `ForgotPasswordRequest` | 200 `MessageResponse` | 422, 429 |
| POST | `/auth/reset-password` | no | `ResetPasswordRequest` | 200 `MessageResponse` | 400, 422 |
| POST | `/auth/change-password` | yes | `ChangePasswordRequest` | 200 `MessageResponse` | 400, 401, 422 |
| DELETE | `/auth/account` | yes | — | 200 `MessageResponse` | 401 |

Notes:
- `POST /auth/signup` creates the user unverified and triggers a verification email. 409 if the email already exists.
- `POST /auth/login` returns 403 while the email is unverified (use resend-verification).
- `POST /auth/forgot-password` always returns the same 200 body, whether or not the email exists (prevents account enumeration).
- `POST /auth/verify-email` and `/auth/reset-password` fail with 400 for expired, used, or invalid tokens.

### Repos

| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/repos` | yes | `RepoCreate` | 201 `RepoOut` | 409, 422 |
| GET | `/repos` | yes | — | 200 `RepoListOut` | 401 |
| GET | `/repos/{repo_id}` | yes | — | 200 `RepoOut` | 401, 404 |
| DELETE | `/repos/{repo_id}` | yes | — | 200 `MessageResponse` | 401, 404 |

Notes:
- 409 on `POST /repos` when the user already added that URL (`uq_user_repo_url`).
- New repos get `status = "added"`.

---

## Part 2 — Pipeline (not_implemented)

Stub responses: **501** with body `{"status": "not_implemented"}`.

| Method | Path | Auth | Request | Success (stub) | Errors |
|---|---|---|---|---|---|
| POST | `/repos/{repo_id}/index` | yes | — | 501 `{"status": "not_implemented"}` | 401, 404 |
| GET | `/repos/{repo_id}/index/status` | yes | — | 501 | 401, 404 |
| GET | `/repos/{repo_id}/index/summary` | yes | — | 501 | 401, 404 |

---

## Part 3 — AI features (not_implemented)

Stub responses: **501** with body `{"status": "not_implemented"}`.

| Method | Path | Auth | Request | Success (stub) | Errors |
|---|---|---|---|---|---|
| POST | `/repos/{repo_id}/plan` | yes | `multipart/form-data` (YAML roadmap file) | 501 | 401, 404 |
| GET | `/repos/{repo_id}/plan` | yes | — | 501 | 401, 404 |
| GET | `/repos/{repo_id}/reader` | yes | — | 501 | 401, 404 |
| POST | `/repos/{repo_id}/context` | yes | JSON `{ "query": str, "mode": str }` | 501 | 401, 404 |
| POST | `/repos/{repo_id}/query` | yes | JSON `{ "query": str, "mode": str }` (intent router) | 501 | 401, 404 |

---

## Part 4 — Agent, evals, hardening (not_implemented)

Stub responses: **501** with body `{"status": "not_implemented"}`.

| Method | Path | Auth | Request | Success (stub) | Errors |
|---|---|---|---|---|---|
| GET | `/repos/{repo_id}/agent/trace` | yes | — | 501 | 401, 404 |
| GET | `/evals` | no | — | 501 | — |

---

## System

| Method | Path | Auth | Request | Success |
|---|---|---|---|---|
| GET | `/health` | no | — | 200 `{"status": "ok"}` |

## Schema index

| Schema | File | Fields |
|---|---|---|
| `SignupRequest` | `auth.py` | `email`, `password` |
| `LoginRequest` | `auth.py` | `email`, `password` |
| `TokenResponse` | `auth.py` | `access_token`, `refresh_token` |
| `RefreshRequest` | `auth.py` | `refresh_token` |
| `VerifyEmailRequest` | `auth.py` | `token` |
| `ResendVerificationRequest` | `auth.py` | `email` |
| `ForgotPasswordRequest` | `auth.py` | `email` |
| `ResetPasswordRequest` | `auth.py` | `token`, `new_password` |
| `ChangePasswordRequest` | `auth.py` | `current_password`, `new_password` |
| `UserOut` | `auth.py` | `id`, `email`, `is_verified`, `created_at` |
| `RepoCreate` | `repo.py` | `url` (derives `owner`, `name`) |
| `RepoOut` | `repo.py` | `id`, `url`, `owner`, `name`, `status`, `created_at` |
| `RepoListOut` | `repo.py` | `repos: RepoOut[]` |
| `ErrorResponse` | `common.py` | `error: { code, message, details? }` |
| `MessageResponse` | `common.py` | `message` |
