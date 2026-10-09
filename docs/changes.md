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
