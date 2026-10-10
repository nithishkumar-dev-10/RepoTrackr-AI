# Changes Log

Every step appends an entry here. Never delete old entries.

---

## Step 0 - Project kickoff files

- **Date:** 2026-10-08
- **Files created:** `AGENTS.md`, `docs/project_summary.md`, `docs/changes.md`
- **What changed and why:** Read the execution plan in full and captured everything future steps need in `docs/project_summary.md`, since the plan file (`docs/RepoTrackr-AI-Execution-Plan.md`) is going to be deleted. Created the agent working rules (`AGENTS.md`) and this change log. (Files were created at the repo root in Step 0 and moved into `docs/` in Step 0.5.)
- **New commands / env variables / endpoints / migrations:** none
- **Known issues / TODOs:** Part 1 backend not started; execution plan file still present and awaiting deletion.

---

## Step 0.5 - Docs moved, structure proposed

- **Date:** 2026-10-08
- **Files created / modified / moved:** created `docs/`; moved `project_summary.md`, `changes.md`, `RepoTrackr-AI-Execution-Plan.md` into `docs/` (plain `mv`, files were untracked); updated all path references in `AGENTS.md`, `docs/project_summary.md`, `docs/changes.md`
- **What changed and why:** Docs are now grouped in one place with `AGENTS.md` staying at the root. Proposed a full P1-P4 folder structure for approval (no folders created in this step).
- **New commands / env variables / endpoints / migrations:** none
- **Known issues / TODOs:** structure awaiting approval at this point in history (approved with changes in Step 0.6).

---

## Step 0.6 - Docs moved + full structure created

- **Date:** 2026-10-08
- **Files created / modified / deleted:** Part A completed the doc moves and path fixes started in Step 0.5 (see entry above); added the "## Structure is fixed" section to `AGENTS.md`; created the full folder skeleton for Parts 1-4 (see tree in `docs/project_summary.md`): 30 empty `__init__.py` files under `backend/app/` and `backend/tests/`, 9 empty `.gitkeep` files in non-Python folders (`frontend/`, `scripts/`, `evals/` + subfolders, `backend/alembic/` + `versions/`); empty `backend/app/main.py`, `backend/requirements.txt`, `backend/.env.example`, `README.md`, `docker/docker-compose.yml` (at root at the time, moved in Step 0.7); root `.gitignore`
- **What changed and why:** The whole approved structure exists now (user approved creating it upfront rather than deferring folders to later parts) so future steps only add code, never move folders. Deterministic code (`pipeline/`, `analysis/`) is separate from LLM code (`ai/`), and `evals/` sits outside the app package. No logic, imports or docstrings anywhere - skeleton only.
- **New commands / env variables / endpoints / migrations:** none. `.gitignore` entries: `.venv/`, `__pycache__/`, `*.pyc`, `.env`, `*.db`, `.pytest_cache/`, `.DS_Store`, `node_modules/`. No venv, no installs, no `alembic init`.
- **Known issues / TODOs:** all code folders are empty packages; requirements.txt, .env.example, README.md, `docker/docker-compose.yml`, main.py are empty placeholders; execution plan file still in docs/ awaiting deletion; nothing runs yet.

---

## Step 0.7 - docker/ folder

- **Date:** 2026-10-08
- **Files created / moved / modified:** created top-level `docker/` (approved exception to the fixed structure); moved `docker-compose.yml` from the project root into `docker/docker-compose.yml` (still empty; plain `mv` - file was untracked); updated all `docker-compose.yml` references in `AGENTS.md`, `docs/project_summary.md`, `docs/changes.md`; added the Step 0.7 note under "Structure is fixed" in `AGENTS.md`
- **What changed and why:** Docker assets now have their own top-level home instead of cluttering the root. Future `docker/backend.Dockerfile` (Part 1 Step 6) will live here too, with build context `../backend`; run via `docker compose -f docker/docker-compose.yml up`.
- **New commands / env variables / endpoints / migrations:** run command changed to `docker compose -f docker/docker-compose.yml up`. No Dockerfile yet.
- **Known issues / TODOs:** `docker/docker-compose.yml` is still an empty placeholder; Dockerfile due in Part 1 Step 6.

---

## Step 0.8 - Setup verification

- **Date:** 2026-10-08
- **Files created / modified / deleted:** modified `docs/project_summary.md` (status line, tree entries for requirements.txt and .venv); appended this entry to `docs/changes.md`. No code files touched.
- **What changed and why:** Read-only verification of the whole setup: venv, root files, folder structure vs the approved tree, docs, and git. Results: 15/18 checks PASS, 3 FAIL - (1) `backend/requirements.txt` was no longer empty, (2) status line was stale at Step 0.6, (3) this entry could not be written under plan mode (now applied). Fixes: this log entry, refreshed status line, tree annotations below.
- **Changes observed that were made outside logged steps (recorded now):** `backend/.venv` created (Python 3.14.2, 36 installed packages incl. fastapi, sqlalchemy, alembic, pydantic, argon2-cffi, pyjwt, slowapi, uvicorn); `backend/requirements.txt` filled with 11 Part 1 dependencies (fastapi, uvicorn[standard], sqlalchemy, alembic, pydantic, pydantic-settings, email-validator, argon2-cffi, pyjwt, python-multipart, slowapi) - kept, not emptied; root `.gitignore` expanded from 8 lines to a full Python/IDE/OS/frontend ignore set (all 9 required entries still present); initial git commit `40e23e0 setup project structure`.
- **New commands / env variables / endpoints / migrations:** none.
- **Known issues / TODOs:** nothing built yet; `docker/docker-compose.yml` and `README.md` still empty; execution plan file still in docs/ awaiting deletion.

---

## Step 1A - Venv, requirements, config

- **Date:** 2026-10-09
- **Files created / modified:**
  - `backend/requirements.txt` - rewritten as full `pip freeze` output with top-level comment listing 11 runtime deps
  - `backend/requirements-dev.txt` - created with `-r requirements.txt` + pinned pytest, httpx and sub-deps
  - `backend/app/core/config.py` - created Settings class (pydantic-settings) with all required fields and cached `get_settings()`
  - `backend/.env.example` - filled with all Settings variables and placeholder values
  - `backend/.env` - created from .env.example with random SECRET_KEY (gitignored)
  - `AGENTS.md` - added venv usage line to Working style
- **What changed and why:** Set up the Python environment with all Part 1 runtime dependencies pinned, added dev dependencies, created the typed configuration layer using pydantic-settings that reads from `.env`, and documented all environment variables. The config provides a single source of truth for app settings, database URL, auth secrets, CORS origins, and SMTP settings.
- **New commands / env variables / endpoints / migrations:**
  - `backend/.venv/bin/python` - Python 3.14.2 (3.11+)
  - `pip check` - clean
  - All env variables from `.env.example` now defined
- **Known issues / TODOs:** DB engine/session, models, Alembic, app factory, CORS, error handlers, routers, endpoints still pending (Steps 1B+).

---

## Step 1B - Database session and models

- **Date:** 2026-10-09
- **Files created:**
  - `backend/app/core/database.py` - SQLAlchemy 2.0 engine, SessionLocal, Base, get_db() dependency with SQLite PRAGMA foreign_keys=ON
  - `backend/app/models/user.py` - User model (id, email unique, password_hash, is_verified, created_at UTC, relationships to EmailToken and Repo with cascade)
  - `backend/app/models/email_token.py` - EmailToken model + EmailTokenType enum (id, user_id FK CASCADE, type enum, token_hash, expires_at/used_at UTC)
  - `backend/app/models/repo.py` - Repo model (id, user_id FK CASCADE, url, owner, name, status default "added", created_at UTC, UNIQUE user_id+url)
  - `backend/app/models/__init__.py` - exports User, EmailToken, EmailTokenType, Repo
- **What changed and why:** Created the database layer and SQLAlchemy 2.0 typed models. The engine reads DATABASE_URL from config, enables SQLite foreign key enforcement, and provides a session dependency. Models use Mapped/mapped_column style with timezone-aware datetimes, proper FK cascades, and constraints. Relationships use cascade="all, delete-orphan" + passive_deletes=True so deleting a User removes its EmailTokens and Repos.
- **New commands / env variables / endpoints / migrations:** none
- **Known issues / TODOs:** Alembic init + first migration, app factory, CORS, error handlers, routers, endpoints still pending (Steps 1C+).

---

## Step 1C - Alembic and first migration

- **Date:** 2026-10-09
- **Files created / modified:**
  - Removed `backend/alembic/.gitkeep` and `backend/alembic/versions/.gitkeep`
  - `backend/alembic.ini` - created by `alembic init`, sqlalchemy.url left empty (set from settings in env.py)
  - `backend/alembic/env.py` - configured with get_settings(), Base, app.models import, render_as_batch=True
  - `backend/alembic/script.py.mako` - default template
  - `backend/alembic/versions/9dbee76d77e4_create_users_email_tokens_repos.py` - first migration creating users, email_tokens, repos tables with all columns, indexes, FKs (ondelete CASCADE), UNIQUE constraints, EmailTokenType enum (verify/reset), and defaults (is_verified=False, status='added')
- **What changed and why:** Initialized Alembic for version-controlled schema migrations. The DB URL comes from config (not hardcoded), env.py reads settings and registers all models. The first migration was autogenerated and manually reviewed/fixed for enum values and defaults. `render_as_batch=True` ensures SQLite and Postgres compatibility.
- **New commands / env variables / endpoints / migrations:**
  - `alembic upgrade head` — creates backend/repotrackr.db with 3 tables + alembic_version
  - `alembic downgrade base` — drops the 3 tables
  - `alembic check` — no new changes (models match migration)
- **Known issues / TODOs:** App factory, CORS, error handlers, routers, endpoints still pending (Step 1D).

---

## Docs cleanup - project_summary.md rewritten, AGENTS.md Rule 1 updated

- **Date:** 2026-10-09
- **Files modified:**
  - `docs/project_summary.md` - completely rewritten to describe only current codebase (no plan content)
  - `AGENTS.md` - RULE 1 replaced with strict "current code only" rule; Design rule added; checklist item 2 updated to "from the real files"
- **What changed and why:** Removed all part-wise plan (P1-P4), scope lists, cut order, eval tables, and future features from project_summary.md. The file now has exactly 9 sections: What this is, Current state, Folder map, File reference, How it connects, Database, Environment variables, Commands, Gotchas. AGENTS.md Rule 1 now explicitly forbids plan content in project_summary.md and points to RepoTrackr-AI-Execution-Plan.md for roadmap.
- **New commands / env variables / endpoints / migrations:** none
- **Known issues / TODOs:** none for this docs-only change.

---

## Step 1D - FastAPI app factory

- **Date:** 2026-10-10
- **Files created / modified:**
  - `backend/app/main.py` - implemented the FastAPI app factory: `create_app()` builds the `FastAPI` object, adds `CORSMiddleware` from `Settings.CORS_ORIGINS`, registers three global exception handlers (validation / HTTP / unhandled) all returning `{"error": {"code", "message", "details"?}}`, adds `GET /health`, and assigns module-level `app = create_app()` for uvicorn.
  - `docs/project_summary.md` - restored as the canonical doc at `docs/` (copied from the current root `project_summary.md`, which was left untouched) and updated Layer 7, the project-structure tree, the stack note, The Full Flow (new HTTP request flow), Current Status, Running It Locally, and Where You Can Help.
  - `docs/changes.md` - this entry.
  - `docs/RepoTrackr-AI-Execution-Plan.md` - restored from git history (commit `40e23e0`, where it last existed) per instruction; not edited. Also confirmed via `alembic upgrade head` that tables `users`, `email_tokens`, `repos` exist (plus `alembic_version`).
- **What changed and why:** Built the top edge of the API so there is now an importable ASGI app. Errors are normalized to one JSON shape for every failure mode, CORS origins come from `.env` via the existing `CORS_ORIGINS` setting, and `GET /health` gives a liveness probe. No models, migrations, auth or schemas were touched.
- **New commands / env variables / endpoints / migrations:**
  - `uvicorn app.main:app --reload` - serves the app on `http://127.0.0.1:8000`
  - `GET /health` - returns `{"status": "ok"}`
  - No new env variables (reuses `CORS_ORIGINS`, `APP_NAME`), no new dependencies, no new migrations.
- **Known issues / TODOs:** No feature routers are registered yet, so only `/health` answers; unknown paths return the `http_error` shape. `app/schemas`, `app/security` and `app/features/*` are still empty. Request-validation error handling is wired but cannot be exercised by a real endpoint until schemas/routers exist.

---

## Step 1E - Pydantic schemas + API contract

- **Date:** 2026-10-10
- **Files created / modified:**
  - `backend/app/schemas/common.py` - `ErrorDetail`, `ErrorResponse` (mirrors the `main.py` error envelope), `MessageResponse`.
  - `backend/app/schemas/auth.py` - `SignupRequest`, `LoginRequest`, `TokenResponse`, `RefreshRequest`, `VerifyEmailRequest`, `ResendVerificationRequest`, `ForgotPasswordRequest`, `ResetPasswordRequest`, `ChangePasswordRequest`, `UserOut`, plus `PASSWORD_MIN_LENGTH` and `validate_password_strength()`.
  - `backend/app/schemas/repo.py` - `RepoCreate` (validates/normalizes a public `github.com/owner/name` URL, exposes parsed `owner`/`name`), `RepoOut` (`from_attributes=True`), `RepoListOut` (`{"repos": [...]}`), plus `parse_github_url()`.
  - `backend/app/schemas/__init__.py` - re-exports every public schema (matches the `models/__init__.py` convention).
  - `docs/api_contract.md` - full endpoint contract for Parts 1-4: method, path, auth, request schema, success schema, error codes; conventions, error-code table, password rule, repo URL rule, schema index.
  - `docs/mock_responses.md` - success and error JSON examples for every Part 1 endpoint plus the Parts 2-4 `not_implemented` stub body.
  - `docs/project_summary.md` - updated the tree, stack note, Layer 7 (files, status, schemas study notes), Current Status, and Where You Can Help.
  - `docs/changes.md` - this entry.
- **What changed and why:** Defined the whole Part 1 request/response contract as typed Pydantic models before any endpoint logic, so the frontend team can build and mock against a stable contract and validation rules (password strength, GitHub URL, email) are enforced in one place. Documented every endpoint for Parts 1-4 and marked Parts 2-4 as `not_implemented`. No models, migrations, endpoints or auth logic were touched.
- **New commands / env variables / endpoints / migrations:**
  - None. No new env variables, dependencies, or migrations. Endpoints listed in `docs/api_contract.md` are contract-only (not implemented in code yet).
- **Assumptions made (changeable):** password = min 8, at least one letter and one digit; `TokenResponse` is `access_token` + `refresh_token` (auth uses `Authorization: Bearer <access_token>`); `RepoListOut` wraps `{"repos": [...]}`; `RepoCreate` accepts only `url` and derives `owner`/`name`; Parts 2-4 stubs return HTTP 501 with `{"status": "not_implemented"}`.
- **Known issues / TODOs:** No endpoint uses the schemas yet. `app/security` (hashing/JWT) and all `app/features/*` routers are still empty; wiring these schemas into routers is future work.

---

## Step 1F - Security utilities

- **Date:** 2026-10-10
- **Files created / modified:**
  - `backend/app/security/passwords.py` - `hash_password()` (argon2 encoded hash) and `verify_password()` (constant-time check returning `False` on mismatch/malformed hash).
  - `backend/app/security/tokens.py` - `TokenType` (`access`/`refresh`), `TokenError`, `create_access_token()`, `create_refresh_token()`, `decode_token(token, expected_type)`; HS256 signed with `SECRET_KEY`, verifies signature + expiry + type.
  - `backend/app/security/email_tokens.py` - `generate_email_token()` (returns raw + SHA-256 hash), `hash_token()`, `expires_at(type)` (verify vs reset lifetimes), `is_expired()`, `is_used()`.
  - `backend/app/security/__init__.py` - re-exports the public security API.
  - `backend/app/core/config.py` - added `VERIFY_TOKEN_EXPIRE_HOURS=24` and `RESET_TOKEN_EXPIRE_MINUTES=30`; `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS` already existed.
  - `backend/.env.example` - added the two new variables.
  - `backend/app/schemas/auth.py` - small change: `TokenResponse.token_type: str = "bearer"`.
  - `backend/tests/conftest.py` - sets deterministic test env vars before app imports.
  - `backend/tests/test_security.py` - 18 tests covering hashing, JWT roundtrip, access/refresh mix-up rejection, expired/tampered/wrong-secret rejection, and email-token hash/expiry/used checks.
  - `docs/api_contract.md`, `docs/mock_responses.md` - `token_type` added to `TokenResponse` docs/examples.
  - `docs/project_summary.md` - tree, stack note, Layer 7 (files, status, security study notes), Current Status, Running It Locally (env vars + `pytest`), Where You Can Help.
  - `docs/changes.md` - this entry.
- **What changed and why:** Implemented the security primitives auth endpoints will call, so no route has to hand-roll hashing, JWT or emailed tokens. Access vs refresh type checking prevents wrong-role reuse; email tokens are high-entropy random values and only their SHA-256 hash is stored.
- **New commands / env variables / endpoints / migrations:**
  - New env vars: `VERIFY_TOKEN_EXPIRE_HOURS` (default 24), `RESET_TOKEN_EXPIRE_MINUTES` (default 30). No new env var for expiry values beyond these.
  - New test command: `python -m pytest tests/ -q` (18 passed).
  - No new dependencies (argon2-cffi and PyJWT already pinned), no endpoints, no migrations.
- **Known issues / TODOs:** No endpoints consume these helpers yet; `decode_token` distinguishes errors only via message (single `TokenError` type). Feature routers (`app/features/*`) remain empty.

---

## Step 1G-a - Email service + core auth endpoints

- **Date:** 2026-10-10
- **Files created:**
  - `backend/app/core/email.py` - `send_email()` (SMTP via `SMTP_*`/`EMAIL_FROM`; when `SMTP_HOST` is empty it logs the message to the console instead of sending), `verification_link()` (builds `FRONTEND_URL` + `/verify-email?token=`), and `send_verification_email()`.
  - `backend/app/features/auth/dependencies.py` - `get_current_user` dependency: reads `Authorization: Bearer <access_token>`, decodes it as an access token, loads the `User`, else 401 `"Not authenticated"`. Reusable by future protected routers (repos).
  - `backend/app/features/auth/router.py` - `APIRouter(prefix="/auth")` with `POST /signup` (201), `POST /verify-email`, `POST /resend-verification`, `POST /login`, `GET /me`.
  - `backend/tests/test_auth.py` - 18 tests covering signup (create/duplicate/weak password/email normalization), verify-email (success/invalid/expired/used), resend-verification (generic response, invalidates old token, skips verified), login (blocked while unverified, success returns tokens, wrong password, unknown email), and `/me` (missing token, valid token, refresh token rejected).
- **Files modified:**
  - `backend/app/main.py` - imports and registers the auth router with `app.include_router(auth_router)` inside `create_app()`.
  - `backend/tests/conftest.py` - rewrote to point `DATABASE_URL` at a temp SQLite file, set `FRONTEND_URL`/`SMTP_HOST` for tests, added session-scoped schema create/drop, per-test table cleanup, and `client`, `db_session`, `sent_emails` fixtures. Existing test env vars kept.
  - `docs/project_summary.md` - intro, project tree, stack note, Layer 7 (files, status, new study notes for the auth router, `get_current_user`, and the email service), The Full Flow (new auth request flow + diagrams), Current Status, Running It Locally (auth endpoints + console email fallback + test commands), Where You Can Help.
  - `docs/changes.md` - this entry.
- **What changed and why:** Built the first working feature on top of the schema/security layers: users can sign up (unverified), receive a single-use expiring verification link, verify, log in for a JWT access/refresh pair, and fetch themselves via `/auth/me`. The email service falls back to logging the message (including the verification link) when SMTP is not configured so the flow is fully usable locally without a mail server. Email addresses are normalized to lowercase; login returns an identical 401 for unknown email and wrong password, and resend-verification returns the same 200 body regardless of whether the account exists (no enumeration). Token/response shapes match `docs/api_contract.md` and `docs/mock_responses.md` (no doc changes needed).
- **New commands / env variables / endpoints / migrations:**
  - New endpoints: `POST /auth/signup`, `POST /auth/verify-email`, `POST /auth/resend-verification`, `POST /auth/login`, `GET /auth/me`.
  - No new env variables (reuses `FRONTEND_URL`, `SMTP_*`, `EMAIL_FROM`), no new dependencies, no new migrations.
  - Test command unchanged: `python -m pytest tests/ -q` (now 36 passed: 18 security + 18 auth).
- **Known issues / TODOs (deferred to later steps, not this one):**
  - Rate limiting (HTTP 429) on signup/login/resend is not implemented yet (slowapi is pinned but unused).
  - Still contract-only: `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/change-password`, `DELETE /auth/account`.
  - If sending the verification email raises, signup/resend log the error and still succeed (user can resend); there is no retry/queue.
  - `get_current_user` returns any authenticated user; there is no separate "must be verified" dependency yet (not needed for the current endpoints).

---

## Step 1G-b - Remaining auth endpoints + rate limiting

- **Date:** 2026-10-10
- **Files created:**
  - `backend/app/core/ratelimit.py` - a slowapi `Limiter(key_func=get_remote_address)` shared by `main.py` and the auth router. slowapi was already pinned in `requirements.txt`, so no new dependency was added.
- **Files modified:**
  - `backend/app/features/auth/router.py` - added `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/change-password`, `DELETE /auth/account`; added `@limiter.limit(lambda: get_settings().RATE_LIMIT_*)` decorators (and a `request: Request` param) to signup, login, resend-verification and forgot-password. `refresh` decodes the token as a refresh token (`decode_token(..., TokenType.REFRESH)` rejects access tokens) and re-checks the user exists and is verified. `forgot-password` always returns the same message and only for an existing user creates a single-use `RESET` token and queues the reset email as a FastAPI `BackgroundTask` (so the response time does not reveal whether the email exists). `reset-password` validates valid/unexpired/unused `reset` token, applies the schema password rule, re-hashes and stamps `used_at`. `change-password` verifies the current password and rejects reusing the old one. `delete_account` deletes the user, relying on the existing ORM/DB cascade for `email_tokens` and `repos`. Added `_invalidate_active_tokens` (shared by resend + forgot) and `_send_reset_safely`.
  - `backend/app/core/email.py` - added `reset_link()` and `send_reset_email()` mirroring the verification helpers.
  - `backend/app/core/config.py` - added `RATE_LIMIT_LOGIN` (5/minute), `RATE_LIMIT_SIGNUP` (10/minute), `RATE_LIMIT_FORGOT_PASSWORD` (5/minute), `RATE_LIMIT_RESEND_VERIFICATION` (5/minute).
  - `backend/app/main.py` - sets `app.state.limiter = limiter` and registers a `RateLimitExceeded` handler that returns the standard envelope `{"error": {"code": "http_error", "message": "Too many requests"}}` with status 429.
  - `backend/.env.example` - added the four `RATE_LIMIT_*` variables with a comment.
  - `backend/tests/conftest.py` - sets the four `RATE_LIMIT_*` env vars to `100000/minute` (relaxed under tests) and added a `sent_reset_emails` fixture that patches `app.features.auth.router.send_reset_email`.
  - `backend/tests/test_auth.py` - 19 new tests (55 total): refresh success / access-token rejected / invalid / expired; logout with and without auth; forgot-password known vs unknown produce identical 200 bodies; reset success (new password works, old fails) / used token / expired token / invalid token / weak password; change-password success / wrong current / same-as-old / requires auth; delete account then login fails / requires auth; login rate-limit hit returns 429 with the standard envelope.
  - `docs/api_contract.md` - expanded the Auth notes (refresh token-only, client-side logout, forgot enumeration/timing, reset token failures, change-password same-as-old, account cascade delete, rate limiting + config).
  - `docs/project_summary.md` - intro, project tree (`core/ratelimit.py`), stack note, Layer 7 (files, status, study notes for the full auth router, email reset helpers, and `core/ratelimit.py`), The Full Flow (auth flow now covers refresh/forgot/reset + limiter), Current Status, Running It Locally (env vars + live endpoints), Where You Can Help.
  - `docs/changes.md` - this entry.
- **What changed and why:** Completed the Part 1 auth surface so a user can refresh sessions, log out, recover a forgotten password, change their password, and delete their account, and added per-IP rate limiting to the abuse-prone endpoints. `forgot-password` is enumeration-safe in both body and timing; reset tokens are single-use and expiring, matching verify tokens. No model or migration changes were needed (reset tokens reuse the existing `email_tokens` table and `EmailTokenType.RESET`).
- **New commands / env variables / endpoints / migrations:**
  - New endpoints: `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/change-password`, `DELETE /auth/account`.
  - New env variables: `RATE_LIMIT_LOGIN`, `RATE_LIMIT_SIGNUP`, `RATE_LIMIT_FORGOT_PASSWORD`, `RATE_LIMIT_RESEND_VERIFICATION` (all `N/period` strings).
  - New dependency: none (slowapi 0.1.10 was already pinned).
  - No new migrations.
  - Test command unchanged: `python -m pytest tests/ -q` (now 55 passed: 18 security + 37 auth).
- **Known issues / TODOs:**
  - Logout is **client-side only** — there is no token-revocation/denylist table (not in the plan), so an access/refresh token stays valid until it expires even after logout. Clients must discard their tokens.
  - Rate limiting uses slowapi's in-memory storage, which is per-process; a multi-worker/multi-instance deploy needs a shared backend (e.g. Redis) for accurate global limits.
  - Reset email is sent in a FastAPI `BackgroundTask`; if it raises, `_send_reset_safely` logs and the request still succeeds (no retry/queue).
  - Rate limiting is disabled (relaxed) under tests via large `RATE_LIMIT_*` values; the dedicated 429 test lowers the limit and resets the limiter storage.
