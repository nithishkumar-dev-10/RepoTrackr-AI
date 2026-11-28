# RepoTrackr AI

RepoTrackr AI is a backend-first tool for ingesting GitHub repositories and reasoning about them. You save a repository link, and (in later parts) it clones the repo, builds a deterministic index and static analysis of the code with `file:line` evidence, and only then lets an AI layer explain what is connected, where to start reading, what is done versus a plan, and how to prompt for what you want to build next.

**Design rule:** deterministic analysis decides what is true (AST, graph, static checks); the AI only retrieves, reasons over evidence and explains. Every AI claim cites `file:line`. If the AI is unavailable, the index and static checks still work.

The project is built in four parts (see `docs/RepoTrackr-AI-Execution-Plan.md`). **Part 1 (this repo's current state)** is the full-stack foundation: accounts, email verification, password reset, saved repo links and a React frontend. The deterministic pipeline (clone, indexer, graph, chunking, BM25 retrieval) exists as tested library/CLI code but is not wired to the API; there is no AI layer.

## Tech stack

- **Python 3.11+** (the checked-in venv runs 3.14)
- **FastAPI** + **Uvicorn** (ASGI API)
- **SQLAlchemy 2.0** (typed ORM) with **SQLite** by default (Postgres-ready)
- **Alembic** (schema migrations)
- **Pydantic v2** + **pydantic-settings** (validation and config)
- **argon2-cffi** (password hashing), **PyJWT** (JWT access/refresh tokens)
- **slowapi** (per-IP rate limiting), **python-multipart** (file uploads), **email-validator**
- SMTP email (dev fallback logs messages to the console)
- **React 19** + **TypeScript** + **Vite** (frontend), Tailwind CSS, framer-motion, react-router-dom

## What works today (Part 1)

- Full email/password auth: signup, email verification, resend, login, refresh, logout, forgot/reset/change password, delete account, `GET /auth/me`, with rate limiting on the abuse-prone endpoints.
- Repo records: add, list, get and delete saved GitHub links (per-user, duplicate-blocked).
- Stub endpoints for Parts 2–4 are registered so the frontend can wire them now; each returns `501 {"status": "not_implemented"}`.
- Consistent JSON error envelope, CORS, and Swagger docs at `/docs`.

The frontend (`frontend/`) lives in this repository: landing, signup/login/verify-email/forgot-password/reset-password, account settings, dashboard, repo workspace and Developer page. It calls the live `/auth`, `/repos` and Part 2 index/graph routes; the Part 3–4 views show a "Demo data" badge while those endpoints return `501`.

Loading, error, Retry and empty states are implemented on the two data-driven pages: the Dashboard (repository list) and the repo workspace (repository, index status/summary and graph). On static pages — landing, Developer and account settings — those states are **N/A**: they render local content or submit a form immediately, with success/failure surfaced by toasts and inline form messages rather than an async list to reload.

## Setup from scratch

Prerequisites: Python 3.11+ and `git`.

```bash
# 1. Go to the backend and create a virtual environment
cd backend
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create your local env file from the template, then set SECRET_KEY
cp .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(32))"   # paste into SECRET_KEY

# 4. Create the database schema
alembic upgrade head                 # creates backend/repotrackr.db
```

Notes:
- `SECRET_KEY` has no default and must be set in `backend/.env`.
- Leave `SMTP_HOST` empty to keep the dev fallback: verification/reset links are printed to the server console instead of being emailed.
- `alembic check` verifies the models match the latest migration.

## Run the server

From `backend/` with the venv active:

```bash
python -m uvicorn app.main:app --reload
```

- API base URL: `http://127.0.0.1:8000`
- Health check: `GET http://127.0.0.1:8000/health` -> `{"status":"ok"}`
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`
- Raw OpenAPI spec: `http://127.0.0.1:8000/openapi.json` (also exported to `docs/openapi.json`)

## Run the tests

From `backend/` with the venv active:

```bash
python -m pytest tests/ -q
```

Tests use a temporary SQLite database and a `TestClient`, and relax the rate limits, so they need no running server or real email.

## Folder structure

```
RepoTrackr-AI/
├── backend/
│   ├── alembic/            # migrations (env.py, versions/)
│   ├── app/
│   │   ├── core/           # config, database engine/session, email, rate limiter
│   │   ├── models/         # SQLAlchemy models (User, EmailToken, Repo)
│   │   ├── schemas/        # Pydantic request/response models
│   │   ├── security/       # password hashing, JWT, email tokens
│   │   ├── features/       # HTTP routers per feature: auth, repos, and stub routers
│   │   │   ├── auth/       #   signup/verify/login/refresh/... (built)
│   │   │   ├── repos/      #   add/list/get/delete repos (built)
│   │   │   ├── indexing/   #   Part 2 stubs
│   │   │   ├── plan/       #   Part 3 stubs
│   │   │   ├── reader/     #   Part 3 stubs
│   │   │   └── context/    #   Part 3 stubs
│   │   ├── agent/          # Part 4 stub(s)
│   │   ├── pipeline/       # clone (+ cleanup), indexer, graph, chunking, BM25 retrieval (library/CLI)
│   │   ├── analysis/       # Part 3 deterministic analysis (empty)
│   │   ├── ai/             # Part 3 AI (empty)
│   │   └── main.py         # app factory, middleware, error handlers, routers
│   └── tests/              # pytest suite
├── docker/                 # docker-compose.yml (not set up yet)
├── docs/                   # API contract, mock responses, summaries, change log
├── evals/                  # Part 4 eval harnesses (empty)
├── frontend/               # React/Vite app (auth pages, dashboard, repo workspace, settings)
└── scripts/                # helper scripts (empty)
```

For the full, section-by-section guide (every file, table, env var and how the pieces connect) see `docs/project_summary.md`.

## API reference and docs

- **`docs/api_contract.md`** — the HTTP contract for every Part 1 endpoint and the Part 2–4 stubs (methods, paths, schemas, status codes).
- **`docs/mock_responses.md`** — ready-to-use example JSON for frontend mocking.
- **`docs/openapi.json`** — the generated OpenAPI 3 spec.
- **`docs/postman_collection.json`** — a Postman collection generated from the spec.
- **`docs/project_summary.md`** — how the project works right now, layer by layer.
- **`docs/changes.md`** — the step-by-step change log.
- **`docs/RepoTrackr-AI-Execution-Plan.md`** — the roadmap for Parts 1–4.

In Swagger (`/docs`) the endpoints are grouped by tag: `system`, `auth`, `repos`, and `stubs` (the not-yet-implemented Part 2–4 endpoints).
