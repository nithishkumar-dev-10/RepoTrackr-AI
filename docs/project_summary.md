# RepoTrackr AI - Project Summary

Single source of truth for the project. Update this file after every step (see AGENTS.md).

## What RepoTrackr AI is

RepoTrackr AI is one web interface that understands a Python repository and answers by query: how it is connected, where to start reading, what is done vs left against your plan, and a token-efficient prompt for what you want to build next. It has regular full-stack work (auth, repo records, pages) plus an analysis pipeline (clone, AST index, graph) and AI features (plan verifier, retrieval, reader guide, context packer) that always cite `file:line` for every claim.

## The plan's 4 parts

| Part | Theme | AI / LLM? | Ends with |
|---|---|---|---|
| 1 | Full-stack foundation: auth, email verification, password reset, repo records, pages | No | Complete, deployable app shell |
| 2 | Pipeline core: clone + index | No | Repo analyzed and visible in the UI |
| 3 | AI features: verifier, retrieval, reader guide, context packer | Yes | All 3 query types work |
| 4 | Agent layer, evals, hardening, demo | Yes | Measured and demo-ready |

### Part 1 - Full-Stack Foundation (no pipeline, no AI)

**Goal:** a complete, production-style web app where a user signs up, verifies their email, logs in, resets a forgotten password, saves repo links, and sees every page. Nothing touches repo contents.

**Backend**
- FastAPI project structure, SQLite + SQLAlchemy (Postgres-ready), Alembic migrations
- `.env` config, CORS, global error handling returning clean JSON
- Pydantic schemas for every request and response
- Auth (email + password only, no Google login):
  - Signup with email + password (hash with argon2 or bcrypt, never plain text); password minimum length + basic strength check
  - Email verification: signed, expiring token link; block login until verified; resend-verification endpoint
  - Login: JWT access token (short expiry) + refresh token
  - Logout and `/me` endpoint
  - Forgot password: reset link by email, always same response so emails cannot be guessed
  - Reset password: signed, expiring, single-use token
  - Change password (logged-in) and delete account
  - Rate limiting on login, signup, forgot-password, resend endpoints
  - Email via SMTP (Mailtrap or Gmail app password for dev, real provider later)
- Repo records (a link saved, nothing more): add (validate public GitHub URL, parse owner/name), list mine, get one, delete; block duplicates per user
- Database tables:
  - `users` (id, email, password_hash, is_verified, created_at)
  - `email_tokens` (id, user_id, type [verify / reset], token_hash, expires_at, used_at)
  - `repos` (id, user_id, url, owner, name, status default `"added"`, created_at)
- Stubs: endpoints for Parts 2-4 exist but return `{"status": "not_implemented"}` so the frontend is already wired

**Frontend (your team)**
- Pages: Landing, Signup, Login, Verify Email (landing for emailed link + resend), Forgot Password, Reset Password, Dashboard (repo list with empty state), Add Repo, Repo Detail (empty placeholder tabs: Overview, Reader, Plan, Context), Account Settings (change password, delete account)
- Behavior: protected routes, automatic token handling (refresh on expiry), loading/error/empty states on every page, form validation matching backend rules, responsive layout

**Shared**
- Day 1: Pydantic schemas + API contract + mock responses sent to the frontend team so nobody is blocked
- README with run instructions, `.env.example`, Postman or Swagger collection
- Tests for auth flows (signup, verify, login, reset) and repo CRUD
- Optional: Docker Compose for one-command local setup

**Not in Part 1:** cloning repos, background tasks, parsing, indexing, any AI/LLM call, Google or social login.

**Done when:** a new user can sign up, verify by email, log in, reset a forgotten password, add and delete repo links, and open the detail page; expired/used/invalid tokens handled correctly; tests pass; README lets a teammate run the whole app from scratch.

### Part 2 - Pipeline Core (clone + index, no LLM)

**Goal:** turn a saved repo link into a searchable index of the code.

- Clone: shallow clone, size limit, timeout, no submodules, sandboxed, never execute any repo code
- Status flow: `added -> queued -> cloning -> indexing -> ready / failed` using FastAPI `BackgroundTasks`
- AST indexer: functions, classes, imports, FastAPI routes, tests, docstrings, each with `file:line`
- Graph: import/call graph with networkx
- Chunking: split code into symbol-level chunks
- Cache: keyed by commit SHA, re-index only changed files
- Secrets: strip `.env` files and keys before anything is stored
- Endpoints: start indexing, get status, get index summary (symbol counts, modules, entry points)
- Log index time per 10k lines of code
- Frontend: status badge with polling on repo list and detail page; Repo Detail "Overview" tab (file tree, symbol counts, entry points, symbol list with `file:line`); error state for failed clones with retry button

**Done when:** you paste a small public Python repo, watch status move to `ready`, and see its symbols and entry points in the UI.

### Part 3 - AI Features (retrieval, verifier, reader, packer)

**Goal:** the three query types on top of the Part 2 index. Deterministic checks first, Gemini only where needed.

Backend, build in this order:
1. **Plan verifier** - YAML roadmap upload and validation; deterministic checks (route exists, function exists, test exists, stub detection via `pass` / `TODO` / `NotImplementedError`); output per item: done / partial / missing / unknown with evidence; Gemini only for semantic items, with Pydantic validation on every output
2. **Hybrid retrieval** - BM25 on identifiers + embeddings of signature and docstring; graph expansion (callers, callees, tests, config, 1-2 hops)
3. **Reader guide** - reading order from entry points, centrality, module clusters; one-line module labels from Gemini; Mermaid diagram at cluster level
4. **Context packer** - fill a token budget (full body for near code, signature only for far code); output compact MD plus a token-efficient prompt, with a token count
5. **Intent router** - start with explicit mode selection in the UI; automatic routing only if time allows
6. **Safety** - strip secrets before every LLM call; track invalid-output rate; log latency and cost per query

Frontend: Plan tab (upload YAML, status per item, click through to cited code); Reader tab (reading order list and Mermaid diagram); Context tab (query box, compact MD output, copyable prompt, token count); query box with mode selector.

**Done when:** all three tabs return real, cited answers on at least 2 repos, and the plan verifier still works with Gemini turned off.

### Part 4 - Agent Layer, Evals, Hardening, Demo

**Goal:** make it agentic, prove it works, and make it safe to show.

- **Agent layer (LangGraph):** multi-step investigation for ambiguous plan items (route -> DB call -> test); tool-failure handling and retries; verify-by-rescan after each decision; trace and tool-call logging
- **Evals** (report results even if a component loses to a baseline):

  | What | Test set | Metrics | Baselines |
  |---|---|---|---|
  | Context packer | 20-30 tasks from closed PRs on 2-3 Python repos | Recall at token budget, tokens used | Full dump, grep top-k, embeddings only |
  | Plan verifier | 40-60 hand-labeled plan items | Precision / recall of "done", false-done rate | LLM with whole repo, keyword match, deterministic only |
  | Agent vs plain pipeline | Per-item traces | Tool-call accuracy, steps per item | Plain pipeline without agent |

- **Hardening:** rate limiting, repo size limits, p50/p95 latency and cost per query dashboards, invalid-LLM-output rate tracking
- **Frontend:** live agent trace view in the Plan tab; optional results page showing eval numbers; polish, empty states, demo mode with a preloaded repo

**Done when:** eval tables exist with real numbers and the full demo runs end to end.

## Design rule (Part 3)

Deterministic analysis decides what is true (AST, graph, checks). The AI only retrieves, reasons over evidence and explains. Every claim cites `file:line`. If the AI is unavailable, the index and static checks still work.

## Scope

**In:** Python repos only, web interface, builder and reader queries, evals.

**Out on purpose:** multi-language support, fine-tuning, mobile app, voice, vision, Google or social login.

**If time runs short, cut in this order:** automatic intent router, then embedding-model comparison, then the Mermaid diagram, then the context packer. **Never cut:** the plan verifier and the evals.

## Tech stack decisions

- **Backend:** FastAPI, SQLite + SQLAlchemy (Postgres-ready), Alembic migrations, Pydantic schemas, FastAPI BackgroundTasks
- **Auth:** email + password only, JWT access + refresh tokens, argon2 or bcrypt hashing, SMTP email (Mailtrap / Gmail app password in dev)
- **Analysis pipeline:** shallow git clone, Python AST parsing, networkx import/call graph, symbol-level chunking, commit-SHA cache
- **AI:** Gemini for semantic plan items, module labels, and related LLM steps; BM25 + embeddings hybrid retrieval; LangGraph for the agent layer
- **Frontend:** separate team; responsive web app, protected routes, polling for status

## Structure (approved in Step 0.6, created as skeleton only)

The whole P1-P4 structure exists now. Only `AGENTS.md`, `README.md`, `.gitignore`, `docs/` and `docker/` live at the root; no other top-level folder may be added without asking first (AGENTS.md, "Structure is fixed"). `frontend/` is reserved for your team. `docker/` was added as a top-level folder in Step 0.7 (approved).

```
RepoTrackr-AI/
├── AGENTS.md                          [all]      agent rules (root, never moved)
├── README.md                          [P1]       empty placeholder
├── .gitignore                         [P1]       .venv/, __pycache__/, *.pyc, .env, *.db, .pytest_cache/, .DS_Store, node_modules/
├── docker/                           [P1]       Docker assets, kept out of root and out of backend/
│   └── docker-compose.yml            [P1]       empty placeholder (optional local setup; run: docker compose -f docker/docker-compose.yml up; Part 1 Step 6 adds docker/backend.Dockerfile here, build context ../backend)
├── docs/                              [all]      project_summary.md, changes.md, RepoTrackr-AI-Execution-Plan.md
├── scripts/                           [P1]       .gitkeep - dev helpers (seed, run, smoke)
├── frontend/                          [P1]       .gitkeep - reserved, built by your team
├── evals/                             [P4]       .gitkeep - outside the app package
│   ├── context_packer/                [P4]       .gitkeep
│   ├── plan_verifier/                 [P4]       .gitkeep
│   ├── agent/                         [P4]       .gitkeep
│   └── data/                          [P4]       .gitkeep - labeled plan items, PR-derived tasks
└── backend/                           FastAPI project
    ├── requirements.txt               [P1]       empty placeholder (requirements only, no pyproject)
    ├── .env.example                   [P1]       empty placeholder
    ├── alembic/ + alembic/versions/   [P1]       .gitkeep each - migrations (no alembic init run yet)
    ├── tests/                         [P1+]      __init__.py - auth/repos tests first, later pipeline/analysis
    └── app/
        ├── __init__.py / main.py      [P1]       main.py empty placeholder
        ├── core/                      [P1]       config, db session, errors, logging, CORS
        ├── security/                  [P1]       password hashing, JWT, signed tokens; secret_strip() added [P2/P3]
        ├── models/                    [P1]       SQLAlchemy models: users, email_tokens, repos; index tables later [P2+]
        ├── schemas/                   [P1]       Pydantic request/response models
        ├── features/                  one folder per domain (vertical slice: router + service + schemas)
        │   ├── auth/                  [P1]       signup, verify, login, reset, me, rate limits
        │   ├── repos/                 [P1]       repo record CRUD (link only)
        │   ├── indexing/              [P2]       start/status/summary endpoints (stub in P1)
        │   ├── plan/                  [P3]       plan verifier endpoints (stub in P1)
        │   ├── reader/                [P3]       reader guide endpoints (stub in P1)
        │   └── context/               [P3]       context packer / query endpoints (stub in P1)
        ├── tasks/                     [P2]       BackgroundTasks status flow: added -> queued -> cloning -> indexing -> ready/failed
        ├── pipeline/                  [P2]       DETERMINISTIC repo processing (runs once at index time)
        │   ├── clone/                 [P2]       shallow clone, size/timeout limits, sandbox, never executes code
        │   ├── indexer/               [P2]       AST: functions, classes, imports, routes, tests, docstrings with file:line
        │   ├── graph/                 [P2]       networkx import/call graph
        │   ├── chunking/              [P2]       symbol-level chunks
        │   └── cache/                 [P2]       commit-SHA keyed cache, re-index changed files only
        ├── analysis/                  [P3]       DETERMINISTIC truth layer (runs per query)
        │   ├── plan_checks/           [P3]       route/function/test exists, stub detection
        │   ├── retrieval/             [P3]       BM25 + graph expansion (1-2 hops)
        │   ├── reader_order/          [P3]       entry points, centrality, module clusters
        │   └── packer/                [P3]       token-budget fill rules (near=full body, far=signature)
        ├── ai/                        [P3]       ONLY package allowed to call LLMs
        │   ├── embeddings/            [P3]       signature/docstring vectors
        │   ├── prompts/               [P3]       prompt templates
        │   └── router/                [P3]       intent router (last, only if time allows)
        └── agent/                     [P4]       LangGraph layer: multi-step investigation, retries, traces
```

**Why it is separated this way**
- `pipeline/` vs `analysis/`: both deterministic, but different lifecycles - pipeline runs once per repo at index time, analysis runs on every query. Keeping them apart lets index code change without touching query code.
- `analysis/` vs `ai/`: this enforces the design rule. Deterministic checks decide truth; `ai/` only retrieves, reasons and explains, and is the only place with LLM calls. With Gemini off, `pipeline/` + `analysis/` must still work. `pipeline/` and `analysis/` must never import from `ai/`.
- `evals/` outside `backend/`: evals are a consumer of the app, not part of it - they must never ship inside the API package and can run as a separate job (e.g. CI). Same reasoning as `frontend/`.
- `features/` as vertical slices (one folder per domain) instead of horizontal routers/services trees: each feature keeps its routes, logic and stubs together, so P2-P4 stub endpoints sit quietly inside `features/` until their part starts.
- `security/secret_strip()` is shared because secrets must be stripped in two places: before storage (P2) and before every LLM call (P3).
- `docker/` at the root (added Step 0.7): infra, not app code - Docker assets would otherwise clutter the root or sit inside `backend/` where they do not belong. Holds `docker/docker-compose.yml` now and `docker/backend.Dockerfile` in Part 1 Step 6 (build context `../backend`, run with `docker compose -f docker/docker-compose.yml up`).

**Which parts own which folder:** [P1] core, security, models, schemas, features/auth, features/repos, alembic, tests (auth/repos), tasks stubs, docker/, README, .gitignore, root config; [P2] tasks, pipeline/*, features/indexing (real), tests/pipeline; [P3] analysis/*, ai/*, features/plan|reader|context (real), tests/analysis; [P4] agent/, evals/.

## Status

Step 0.6 done: full structure created, no logic yet.

- Done: docs moved to `docs/`, path references fixed, AGENTS.md updated (docs/ paths + "Structure is fixed" section), full P1-P4 skeleton created (30 empty `__init__.py`, 9 `.gitkeep`, 5 empty placeholder files, root `.gitignore`).
- Everything is an empty placeholder: no modules, no imports, no logic, no tables, no migrations, no venv, no installs. Nothing runs.
- Next: Part 1 backend setup, per step prompts - do not build ahead.
