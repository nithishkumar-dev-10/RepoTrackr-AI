# RepoTrackr AI

RepoTrackr AI is a backend-first tool for ingesting GitHub repositories and reasoning about them. You save a repository link, and (in later parts) it clones the repo, builds a deterministic index and static analysis of the code with `file:line` evidence, and only then lets an AI layer explain what is connected, where to start reading, what is done versus a plan, and how to prompt for what you want to build next.

**Design rule:** deterministic analysis decides what is true (AST, graph, static checks); the AI only retrieves, reasons over evidence and explains. Every AI claim cites `file:line`. If the AI is unavailable, the index and static checks still work.

The project is built in four parts (see `docs/RepoTrackr-AI-Execution-Plan.md`). **Parts 1 and 2 are implemented in this repo:** the full-stack foundation (accounts, email verification, password reset, saved repo links, React frontend) plus the live deterministic indexing pipeline (safe clone, AST index, code graph, chunking) served by `/repos/{id}/index`, `/index/status`, `/index/summary` and `/graph`. BM25 retrieval is available as a CLI/library, not an endpoint. Parts 3–4 (AI and evals) are registered `501` stubs; there is no LLM provider.

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

## What works today

- Full email/password auth: signup, email verification, resend, login (with a distinct `email_not_verified` code for unverified accounts), refresh, logout, forgot/reset/change password, delete account, `GET /auth/me`, with rate limiting on the abuse-prone endpoints.
- Repo records: add, list, get and delete saved GitHub links (per-user, duplicate-blocked).
- Live Part 2 indexing: start a background clone → AST index → graph → chunk job, poll its status, read the persisted summary, and fetch the graph mapped to the frontend `Graph` shape (capped at 300 nodes / 1000 edges with `truncated`). Stored chunks and summaries are redacted for secret-shaped values without shifting `file:line` numbers.
- Stub endpoints for Parts 3–4 are registered so the frontend can wire them now; each returns `501 {"status": "not_implemented"}`.
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
- Leave `SMTP_HOST` empty to keep the dev fallback: the console logs only the recipient and subject, never a tokenized link.
- `alembic check` verifies the models match the latest migration.

### Email verification flag

`REQUIRE_EMAIL_VERIFICATION` defaults to `true` (secure by default). For local dev/demo only, put these lines in `backend/.env`:

```dotenv
APP_ENV=dev
ENV=dev
REQUIRE_EMAIL_VERIFICATION=false
```

Set the flag back to `true` when hosting. With the flag false, signup creates a verified user, sends no verification email, and returns `"verification_required": false`; the frontend skips the "Check your email" page and sends the user to login. Login never returns `email_not_verified`. The verify-email and resend-verification endpoints still return 200 with a clear "Email verification is disabled" message. Startup logs `Email verification is DISABLED (dev/demo mode)` once; `APP_ENV=production` (or `ENV=prod`) with the flag false refuses to start.

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
│   │   ├── core/           # config, database engine/session, email, rate limiter, typed error codes
│   │   ├── models/         # SQLAlchemy models (User, EmailToken, RefreshToken, Repo)
│   │   ├── schemas/        # Pydantic request/response models
│   │   ├── security/       # password hashing, JWT, email tokens
│   │   ├── features/       # HTTP routers per feature
│   │   │   ├── auth/       #   signup/verify/login/refresh/... (built)
│   │   │   ├── repos/      #   add/list/get/delete repos (built)
│   │   │   ├── indexing/   #   Part 2: /index, /index/status, /index/summary, /graph
│   │   │   ├── plan/       #   Part 3 stubs
│   │   │   ├── reader/     #   Part 3 stubs
│   │   │   └── context/    #   Part 3 stubs
│   │   ├── agent/          # Part 4 stub(s)
│   │   ├── pipeline/       # clone (+ cleanup + redaction), indexer, graph, chunking, BM25 retrieval
│   │   ├── analysis/       # Part 3 deterministic analysis (empty)
│   │   ├── ai/             # Part 3 AI (empty)
│   │   └── main.py         # app factory, middleware, error handlers, routers
│   └── tests/              # pytest suite (301 tests)
├── docker/                 # empty placeholder (no compose file yet)
├── docs/                   # API contract, mock responses, summaries, change log
├── evals/                  # Part 4 eval harnesses (empty)
├── frontend/               # React/Vite app (auth pages, dashboard, repo workspace, settings)
└── scripts/                # helper scripts (empty)
```

For the full, section-by-section guide (every file, table, env var and how the pieces connect) see `docs/project_summary.md`.

## API reference and docs

- **`docs/api_contract.md`** — the HTTP contract for every Part 1 and live Part 2 endpoint plus the Part 3–4 stubs (methods, paths, schemas, status codes).
- **`docs/mock_responses.md`** — ready-to-use example JSON for frontend mocking.
- **`docs/openapi.json`** — the generated OpenAPI 3 spec.
- **`docs/postman_collection.json`** — a Postman collection generated from the spec.
- **`docs/project_summary.md`** — how the project works right now, layer by layer.
- **`docs/changes.md`** — the step-by-step change log.
- **`docs/RepoTrackr-AI-Execution-Plan.md`** — the roadmap for Parts 1–4.

In Swagger (`/docs`) the endpoints are grouped by tag: `system`, `auth`, `repos`, `indexing` (the live Part 2 routes) and `stubs` (the not-yet-implemented Part 3–4 endpoints plus `/evals`).

## Known limitations

- No AI/LLM provider, embeddings, eval harness or agent loop exists yet; Reader, Plan and Context views in the frontend are labelled demo data.
- BM25 retrieval is a CLI/library only — there is no retrieval HTTP endpoint.
- Indexing parses Python only and is a single background task in-process; status recovery assumes one uvicorn worker. The rate limiter is also per-process.
- Graph responses are capped at 300 nodes / 1000 edges (`truncated: true`); summaries written before the graph endpoint existed return an empty graph until reindexed.
- `docker/` is an empty placeholder: no Dockerfile or compose stack is provided. Run the backend and Vite dev server directly.
- Frontend has no automated test suite; verification is typecheck, lint, production build and manual/browser checks. Vite reports large chunks (elk/Graph3D) as an advisory.
- Dev email fallback prints only recipient/subject, so local verification must use the dev flow described in `docs/project_summary.md` rather than reading tokens from logs.
