# Project Summary

## What This Project Is
RepoTrackr AI is a backend-first tool for ingesting GitHub repositories and reasoning about them: it clones a repo, builds a deterministic index and static analysis of the code, and only then lets an AI layer explain things on top of that evidence. The backend has settings, the database engine, the SQLAlchemy models, four Alembic migrations, and a FastAPI app that serves `GET /health` plus a complete email/password auth flow (signup, email verification, resend, login, token refresh with stored refresh-token hashes, logout with server-side refresh revocation, forgot/reset/change password, delete account, and `GET /auth/me`) with per-IP rate limiting on the abuse-prone endpoints, CORS, and consistent JSON error handling, plus a repo-records feature (add, list, get, delete a saved GitHub link, with duplicate blocking). The Part 2 index endpoints now run the pipeline in a `BackgroundTasks` job; the remaining Part 3–4 endpoints are still ownership-checked stubs that return `501 {"status": "not_implemented"}`. A complete React + TypeScript + Vite frontend lives in `frontend/`: a landing page, signup/login/verify-email/forgot-password/reset-password, account settings, a dashboard, a repo workspace (dark code-graph canvas with 2D as the default and an optional 3D view, Overview/Reader/Plan/Context tabs and a ⌘K command bar) and a Developer page. The Overview tab, index controls and workspace graph call the real Part 2 endpoints; only the Part 3–4 query modes still use local mock data, with the fake-evidence labels marked "Not implemented yet".

The deterministic indexing path is now wired end to end: `app/tasks/__init__.py` runs clone → AST index → graph → chunk after `POST /repos/{id}/index`, persists `Repo.status`, `Repo.error_message`, `Repo.commit_sha` and a JSON index summary, and skips work when the commit SHA is unchanged. The cache check accepts both `ready` and `queued`, because the HTTP start endpoint writes `queued` before the background task runs. `app/pipeline/clone/` performs a safe shallow clone with size/timeout limits and secret/junk cleanup; `app/pipeline/indexer/` parses Python source with `ast` into symbols, imports and calls; `app/pipeline/graph/` turns that index into a networkx module/symbol graph with PageRank centrality, a suggested reading order and a Mermaid diagram; `app/pipeline/chunking/` cuts the index into one chunk per function/class/method, counts tokens with `tiktoken` and caches chunks per file hash in SQLite; and `app/pipeline/retrieval/` ranks those stored chunks with BM25 as a CLI/library only. `app/analysis/*`, `app/ai/*` and `app/agent` are still empty or stub-only: there is no LLM provider (Gemini or otherwise), no embeddings, no eval set, and no retrieval/agent endpoint.

## Project Structure
```
RepoTrackr-AI/
├── .gitignore                       # Ignores Python/venv/secrets/DB/frontend junk
├── AGENTS.md                        # Working rules for contributors/agents
├── README.md                        # Setup, run, test, folder map, docs links
├── backend/
│   ├── .env                         # Real local secrets/settings (gitignored)
│   ├── .env.example                 # Template for backend/.env
│   ├── alembic.ini                  # Alembic config; URL injected from settings
│   ├── requirements.txt             # Pinned runtime deps (full pip freeze)
│   ├── requirements-dev.txt         # Runtime deps + pytest/httpx for tests
│   ├── alembic/
│   │   ├── README                   # Default Alembic readme
│   │   ├── env.py                   # Wires settings + Base + models into migrations
│   │   ├── script.py.mako           # Default template for new migrations
│   │   └── versions/
│   │       ├── 9dbee76d77e4_create_users_email_tokens_repos.py  # First migration
│   │       ├── 09282e667a32_add_commit_sha_to_repos.py          # Adds repos.commit_sha
│   │       ├── b7c1f2a9d4e6_add_repo_index_fields.py             # Adds repos.error_message + repos.index_summary
│   │       └── c4d8e7a1b2f3_add_refresh_tokens.py                # Adds refresh_tokens
│   ├── app/
│   │   ├── __init__.py              # Empty package marker
│   │   ├── main.py                  # FastAPI app factory: create_app(), CORS, error handlers, GET /health
│   │   ├── core/
│   │   │   ├── __init__.py          # Empty package marker
│   │   │   ├── config.py            # Settings class + cached get_settings()
│   │   │   ├── database.py          # Engine, Base, SessionLocal, get_db()
│   │   │   ├── email.py             # send_email (SMTP/dev console), verify + reset email helpers
│   │   │   ├── errors.py            # ApiHTTPException / EmailNotVerifiedError: typed error codes
│   │   │   └── ratelimit.py         # slowapi Limiter (per-IP) used by auth endpoints
│   │   ├── models/
│   │   │   ├── __init__.py          # Re-exports User, EmailToken, RefreshToken, Repo
│   │   │   ├── user.py              # User table + relationships
│   │   │   ├── email_token.py       # EmailToken table + EmailTokenType enum
│   │   │   ├── refresh_token.py     # RefreshToken table: hashed refresh tokens with revocation
│   │   │   └── repo.py              # Repo table: status, error_message, commit_sha, index_summary
│   │   ├── schemas/
│   │   │   ├── __init__.py          # Re-exports all schemas
│   │   │   ├── common.py            # ErrorDetail, ErrorResponse, MessageResponse
│   │   │   ├── auth.py              # Auth request/response schemas + password rule
│   │   │   ├── repo.py              # RepoCreate/RepoOut/RepoListOut + GitHub URL parse
│   │   │   ├── indexing.py          # IndexStartOut, IndexStatusOut, IndexSummaryOut
│   │   │   └── stub.py              # StubQueryRequest ({query, mode}) for the Part 3 stubs
│   │   ├── security/
│   │   │   ├── __init__.py          # Re-exports password/JWT/email-token helpers
│   │   │   ├── passwords.py         # hash_password, verify_password (argon2)
│   │   │   ├── tokens.py            # JWT access/refresh create + decode_token
│   │   │   └── email_tokens.py      # verify/reset token generate/hash/expiry
│   │   ├── features/
│   │   │   ├── __init__.py          # Empty package marker
│   │   │   ├── auth/
│   │   │   │   ├── __init__.py      # Empty package marker
│   │   │   │   ├── dependencies.py  # get_current_user Bearer access-token dependency
│   │   │   │   └── router.py        # signup, verify, resend, login, refresh, logout, forgot/reset/change password, delete account, /me
│   │   │   ├── repos/
│   │   │   │   ├── __init__.py      # Empty package marker
│   │   │   │   ├── dependencies.py  # get_owned_repo: 404 unless the repo belongs to the caller
│   │   │   │   └── router.py        # add/list/get/delete my repos (auth required)
│   │   │   ├── plan/router.py       # Stub: POST/GET /repos/{id}/plan (501)
│   │   │   ├── indexing/router.py   # POST /index + GET /index/status + GET /index/summary + GET /graph
│   │   │   │   └── graph_out.py     # Maps stored build_graph() output to the frontend Graph contract
│   │   │   ├── context/router.py    # Stubs: POST /repos/{id}/context + /query (501)
│   │   │   └── reader/router.py     # Stub: GET /repos/{id}/reader (501)
│   │   ├── pipeline/
│   │   │   ├── __init__.py          # Empty package marker
│   │   │   ├── clone/
│   │   │   │   ├── __init__.py      # Re-exports safe_clone, clean_repo, models, errors, cleanup API
│   │   │   │   ├── clone.py         # safe_clone: GitHub HTTPS allow-list, shallow clone, size/timeout limits, SHA
│   │   │   │   ├── cleanup.py       # remove_clone, clone_workspace, sweep_stale_clones
│   │   │   │   ├── errors.py        # CloneError + error codes (invalid_url, size_exceeded, …)
│   │   │   │   ├── filters.py       # is_skipped_dir, is_secret_file, clean_repo
│   │   │   │   ├── models.py        # CloneConfig, CloneResult
│   │   │   │   └── redaction.py     # redact_secrets: line-preserving in-line secret replacement
│   │   │   ├── indexer/
│   │   │   │   ├── __init__.py      # Re-exports index_repo/parse_file/parse_source + models
│   │   │   │   ├── __main__.py      # CLI: python -m app.pipeline.indexer <folder>
│   │   │   │   ├── detect.py        # Test-file/entry-point detection helpers
│   │   │   │   ├── models.py        # Symbol, ImportRef, CallRef, FileIndex, RepoIndex
│   │   │   │   ├── parser.py        # ast-based parse_source/parse_file (never imports code)
│   │   │   │   └── repo.py          # index_repo: walk a folder, skip junk, build RepoIndex
│   │   │   ├── graph/
│   │   │   │   ├── __init__.py      # Re-exports build_graph, reading_order, mermaid_diagram
│   │   │   │   ├── __main__.py      # CLI: python -m app.pipeline.graph <folder>
│   │   │   │   ├── builder.py       # networkx graph: module/symbol nodes, import/call edges, PageRank
│   │   │   │   ├── mermaid.py       # mermaid_diagram: the graph as Mermaid flowchart text
│   │   │   │   ├── models.py        # GraphNode, GraphEdge, CentralityScore, GraphResult
│   │   │   │   └── reading_order.py # BFS reading order: entry points first, then imports
│   │   │   ├── chunking/
│   │   │   │   ├── __init__.py      # Re-exports build_chunks, Chunk, ChunkSet, ChunkStore
│   │   │   │   ├── __main__.py      # CLI: python -m app.pipeline.chunking <folder> [--sha] [--db]
│   │   │   │   ├── builder.py       # build_chunks: one chunk per symbol + tiktoken counts
│   │   │   │   ├── models.py        # Chunk, ChunkSet, MAX_TOKENS = 2000
│   │   │   │   └── store.py         # ChunkStore: SQLite `chunks` + `file_cache` tables
│   │   │   ├── retrieval/
│   │   │   │   ├── __init__.py      # Re-exports BM25Index, load_index, tokenize, SearchResult
│   │   │   │   ├── __main__.py      # CLI: python -m app.pipeline.retrieval "<query>" [--k] [--sha] [--db]
│   │   │   │   ├── index.py         # BM25Index + load_index/default_commit_sha over stored chunks
│   │   │   │   ├── models.py        # SearchResult (id, symbol, kind, file, lines, score, tokens)
│   │   │   │   ├── queries.py       # Batch runner: python -m app.pipeline.retrieval.queries <file>
│   │   │   │   └── tokenizer.py     # tokenize: lowercase, split snake_case/camelCase/paths
│   │   │   └── cache/__init__.py    # Commit-SHA + summary cache-hit check for indexing
│   │   ├── analysis/
│   │   │   ├── __init__.py          # Empty package marker
│   │   │   ├── reader_order/__init__.py  # Empty — file reading order
│   │   │   ├── retrieval/__init__.py     # Empty — evidence retrieval
│   │   │   ├── plan_checks/__init__.py   # Empty — deterministic plan checks
│   │   │   └── packer/__init__.py        # Empty — context packing
│   │   ├── ai/
│   │   │   ├── __init__.py          # Empty package marker
│   │   │   ├── embeddings/__init__.py    # Empty — embeddings
│   │   │   ├── prompts/__init__.py       # Empty — prompt templates
│   │   │   └── router/__init__.py        # Empty — model routing
│   │   ├── agent/
│   │   │   ├── __init__.py          # Empty package marker
│   │   │   └── router.py            # Stub: GET /repos/{id}/agent/trace (501)
│   │   └── tasks/__init__.py        # run_index_pipeline + mark_stuck_repos_failed
│   ├── data/                        # Runtime artifacts (gitignored)
│   │   ├── chunks.db                # SQLite: chunks + file_cache (written by chunking)
│   │   ├── queries.txt              # The 10 BM25 test queries (5 names, 5 plain-words)
│   │   └── bm25_failure_notes.md    # Per-query findings and failure patterns
│   └── tests/
│       ├── __init__.py              # Test package marker
│       ├── conftest.py              # Test env vars + temp DB, TestClient and fixtures
│       ├── test_security.py         # Security unit tests (18)
│       ├── test_auth.py             # Auth endpoint tests (42)
│       ├── test_repos.py            # Repo CRUD endpoint tests (19)
│       ├── test_stubs.py            # Part 3-4 stub tests, 501 / 401 / 404 (20)
│       ├── test_indexing.py         # Index flow, status, summary, cache, ownership (10)
│       ├── test_graph_endpoint.py   # GET /graph shape, 401/404/409, caps (5)
│       ├── test_schema_defaults.py  # Raw-INSERT regression tests for ORM/migration defaults (2)
│       └── pipeline/
│           ├── __init__.py          # Test package marker
│           ├── conftest.py          # Shared pipeline fixtures (temp repos, git helpers)
│           ├── test_clone.py        # safe_clone + filters/limits (74)
│           ├── test_indexer.py      # AST parsing, symbols, imports, calls (24)
│           ├── test_graph.py        # graph building, centrality, reading order (16)
│           ├── test_chunking.py     # chunks, token counts, cache (11)
│           └── test_retrieval.py    # tokenizer, BM25 ranking, queries runner (19)
├── docker/
│   └── .gitkeep                     # Empty placeholder; no compose file or Dockerfile yet
├── docs/
│   ├── RepoTrackr-AI-Execution-Plan.md  # Source-of-truth roadmap (Parts 1-4)
│   ├── project_summary.md           # This file (canonical)
│   ├── api_contract.md              # Endpoint contract for Parts 1-4
│   ├── mock_responses.md            # Example JSON: live Part 1/2 responses + Part 3–4 mocks
│   ├── openapi.json                 # Generated OpenAPI 3.1 spec
│   ├── postman_collection.json      # Postman collection generated from the spec
│   └── changes.md                   # Step-by-step change log (all history)
├── evals/
│   ├── .gitkeep
│   ├── agent/.gitkeep               # Empty — agent evals
│   ├── context_packer/.gitkeep      # Empty — packer evals
│   ├── data/.gitkeep                # Empty — eval data
│   └── plan_verifier/.gitkeep       # Empty — plan verification evals
├── frontend/                        # React + TS + Vite client (see Layer 8)
│   ├── .env.example                 # VITE_API_URL + VITE_USE_MOCKS template (a real .env is gitignored)
│   ├── index.html                   # Vite HTML entry
│   ├── package.json                 # Scripts: dev, build, typecheck, lint
│   ├── vite.config.ts               # Vite + Tailwind + `@` alias
│   ├── tsconfig*.json               # App/node TS configs (strict, verbatimModuleSyntax)
│   ├── .oxlintrc.json               # Lint rules (oxlint)
│   ├── components.json              # shadcn/ui config
│   ├── public/                      # favicon.svg, icons.svg
│   └── src/
│       ├── main.tsx                 # Providers (MotionConfig/Auth/Toast/Tooltip) + root render
│       ├── App.tsx                  # Route table (public / guest / protected)
│       ├── index.css                # Design tokens (colors, radii, glow tokens/utilities) + Tailwind layers
│       ├── api/                     # client.ts, auth.ts, repos.ts, galaxy.ts (Part 2 live incl. /graph; 501 mock fallback)
│       ├── mock/                    # Typed mock data for the 501 endpoints
│       ├── types/                   # Wire + UI types (auth, repo, graph, query, pipeline, api)
│       ├── lib/                     # env, tokenStorage, motion, validation, authErrors, github,
│       │                            #   graphLayout, graphVisuals, designTokens, planStatus, endpoints, apiLog, utils
│       ├── context/                 # AuthContext, ToastContext
│       ├── components/              # shared (GlowCard, GlowButton, GlowRipple, …) + ui/ (Radix)
│       │                            #   + landing/ + auth/ + dashboard/ + workspace/ (OverviewPanel.tsx)
│       └── pages/                   # Landing, Signup, Login, VerifyEmail, ForgotPassword,
│                                    #   ResetPassword, AccountSettings, Dashboard,
│                                    #   RepoWorkspace, Developer, NotFound
└── scripts/
    └── .gitkeep                     # Empty — helper scripts
```

## The Stack at a Glance
Settings -> Database Core -> Data Models -> Schema Migrations (Alembic) -> Pipeline & Analysis -> AI Layer -> Features & HTTP API -> Frontend, with Docker/Evals/Scripts as supporting tooling.

(Layers 1–4 are fully built. Layer 7 has its app factory, `GET /health`, the complete auth feature with rate limiting, the repo-records feature (add/list/get/delete), the live Part 2 index endpoints, the remaining Part 3–4 stub endpoints, the Pydantic schemas, the endpoint/mock/OpenAPI/Postman contract, and the `security` helpers (password hashing, JWT, email tokens), plus unit and endpoint tests. Layer 8 (the frontend) is built and talks to Layer 7: its Overview tab, status polling, start/retry actions and workspace graph use the live Part 2 routes, while only its Part 3–4 query modes still use labelled mock data. Layer 5 is wired for indexing: `pipeline/clone`, `pipeline/indexer`, `pipeline/graph`, `pipeline/chunking`, `pipeline/cache` and `tasks` are called by `POST /repos/{id}/index`; `pipeline/retrieval` remains a CLI/library, and all of `analysis/` is still empty. Layer 6 (AI) is still an empty skeleton, and its endpoints are the `501` stubs the frontend marks "Not implemented yet".)

## Layer by Layer

### Layer 1: Settings & Configuration

**What it is:** The single typed object that reads every configuration value (database URL, secrets, CORS, SMTP) from `backend/.env`.
**Why it exists:** Apart from the rest of the app, config lets you change environments without touching code and gives one source of truth that all higher layers import.
**Files in it:** `backend/app/core/config.py` defines the `Settings` class and `get_settings()`; `backend/.env.example` documents every variable; `backend/.env` holds real local values.
**Depends on:** nothing (it is the bottom).
**Used by:** Database Core (database URL), Schema Migrations (database URL), and every future layer that needs a secret or setting.

#### Study Notes for this layer

**What is `Settings`?**
A `pydantic-settings` `BaseSettings` subclass where each attribute is one environment variable with a type and default.
*Why do we need it?* It validates config at startup — a wrong type or missing required value fails fast instead of crashing later.
*What breaks without it?* The app has no typed, single place to read config; every module would read `os.environ` on its own.
*Think of it as:* the settings app on your phone — one place where all preferences live and are checked as valid.

**What is `get_settings`?**
A function wrapped in `@lru_cache` that builds `Settings()` once and returns the same instance afterward.
*Why do we need it?* Parsing `.env` and validating is work you only want to do once; caching keeps it cheap and consistent.
*What breaks without it?* Every import re-reads and re-validates the file, and you can get different instances holding different values.
*Think of it as:* the restaurant host who greets you once and remembers you, instead of making you re-register every time you walk past.

**What is `ENV_FILE`?**
A `Path` pointing at `backend/.env`, computed from `config.py`'s own file location (`parents[2]`).
*Why do we need it?* So `.env` is found no matter which directory you run Python from.
*What breaks without it?* Alembic (run from `backend/`) and tests (run from elsewhere) could each look in the wrong folder for `.env`.
*Think of it as:* a fixed home address so mail always arrives at the right door regardless of where the sender is standing.

**What is `_parse_cors_origins`?**
A `field_validator` that turns the `CORS_ORIGINS` string (`"http://a,http://b"`) into a clean `list[str]`.
*Why do we need it?* Env vars are strings; CORS needs a list, and hand-editing commas/spaces is error-prone.
*What breaks without it?* `CORS_ORIGINS` would be a raw string and CORS middleware would get the wrong shape.
*Think of it as:* a mail sorter who turns one comma-separated envelope into separate labeled letters.

**Why is `SECRET_KEY` the only required field?**
It has no default, so `Settings()` raises if it is missing; everything else has a sane default.
*Why do we need it?* Running in dev shouldn't require setting 12 variables, but you must never ship without a signing secret.
*What breaks without it?* The app silently starts with no/weak signing key for tokens.
*Think of it as:* a building that lets you in with defaults but insists you bring your own unique master key.

---

### Layer 2: Database Core

**What it is:** The SQLAlchemy engine, the declarative `Base`, the session factory, and the `get_db()` dependency, including SQLite foreign-key enforcement.
**Why it exists:** It isolates "how we talk to the database" from "what our tables look like" (models) and from HTTP code, so connections and sessions are created the same way everywhere.
**Files in it:** `backend/app/core/database.py`.
**Depends on:** Layer 1 (Settings for `DATABASE_URL`).
**Used by:** Data Models (they subclass `Base`), Schema Migrations (reads `Base.metadata`), and future features that request a session via `get_db()`.

#### Study Notes for this layer

**What is `Base`?**
The declarative base class (`DeclarativeBase`) that every ORM model inherits from.
*Why do we need it?* SQLAlchemy discovers all tables and relationships through the metadata attached to `Base`.
*What breaks without it?* Models can't be declared, and Alembic has no metadata to autogenerate migrations from.
*Think of it as:* the family name all tables share so the system can find the whole family at once.

**What is `engine`?**
The object created by `create_engine(settings.DATABASE_URL, ...)` that manages real connections to the database.
*Why do we need it?* It owns the connection pool and dialect; every session is bound to it.
*What breaks without it?* Nothing can open a connection; both the app and Alembic are dead in the water.
*Think of it as:* the phone line to the database — one line, reused for every call.

**What is `SessionLocal`?**
A configured `sessionmaker` (`autocommit=False`, `autoflush=False`, `expire_on_commit=False`).
*Why do we need it?* It produces `Session` objects with consistent behavior instead of ad-hoc config per call.
*What breaks without it?* Sessions would behave differently across modules and reads after commit could surprise you.
*Think of it as:* a standardized notepad — every request gets a fresh page with the same rules.

**What is `get_db`?**
A generator dependency that yields a session and always closes it in `finally`.
*Why do we need it?* FastAPI endpoints will `Depends(get_db)` to get a session and have it cleaned up automatically.
*What breaks without it?* Connections leak on errors or early returns, slowly exhausting the pool.
*Think of it as:* a librarian who hands you a book and always takes it back when you leave, even if you rush out.

**What is `_set_sqlite_pragma`?**
An `event.listens_for(engine, "connect")` hook that runs `PRAGMA foreign_keys=ON` on each SQLite connection.
*Why do we need it?* SQLite ignores foreign keys by default; without this, `ondelete="CASCADE"` does nothing.
*What breaks without it?* Deleting a `User` would leave orphaned `email_tokens` and `repos` rows.
*Think of it as:* flipping the safety switch that SQLite ships turned off.

**Why the `check_same_thread=False` argument?**
It's only added for SQLite URLs so FastAPI can use a connection across threads.
*Why do we need it?* SQLite's default is strict about thread ownership, which clashes with async servers.
*What breaks without it?* You'd get "SQLite objects created in a thread can only be used in that same thread" errors.
*Think of it as:* unlocking a door that SQLite locks per-thread but the web server needs shared.

---

### Layer 3: Data Models

**What it is:** The SQLAlchemy ORM classes that define the `users`, `email_tokens`, `refresh_tokens`, and `repos` tables and their relationships.
**Why it exists:** Separating the table definitions from the engine and from request schemas keeps the persistence shape in one obvious place.
**Files in it:** `backend/app/models/user.py` (`User`), `backend/app/models/email_token.py` (`EmailToken`, `EmailTokenType`), `backend/app/models/refresh_token.py` (`RefreshToken`), `backend/app/models/repo.py` (`Repo`), and `backend/app/models/__init__.py` (re-exports all four + the enum).
**Depends on:** Layer 2 (`Base`).
**Used by:** Schema Migrations (metadata for autogenerate) and all future feature/API code.

#### Study Notes for this layer

**What is `User`?**
The model for a person: `id`, unique indexed `email`, `password_hash`, `is_verified`, and timezone-aware `created_at`.
*Why do we need it?* It is the anchor record every email token and repo hangs off.
*What breaks without it?* There is no owner for tokens or repos and no way to authenticate anyone.
*Think of it as:* the account card at the top of every other document in a filing cabinet.

**What are the `User` relationships?**
`email_tokens`, `refresh_tokens`, and `repos` are `relationship(...)` lists with `cascade="all, delete-orphan"` and `passive_deletes=True`.
*Why do we need it?* They let you reach a user's email tokens, refresh tokens and repos in Python and define what happens on delete.
*What breaks without it?* Deleting a user would not clean up children (or would do it inefficiently in Python instead of the DB).
*Think of it as:* closing your account and having the bank automatically shred all linked statements.

**What is `EmailToken`?**
A model storing a hashed one-time token per user: `user_id`, `type`, `token_hash` (indexed), `expires_at`, `used_at`.
*Why do we need it?* Email verification and password reset both need short-lived, single-use tokens.
*What breaks without it?* Password reset and email verification have nowhere to store/validate their tokens.
*Think of it as:* a numbered claim ticket you swap for a service, then it's stamped used.

**What is `RefreshToken`?**
A model storing the SHA-256 hash of an issued refresh JWT: `user_id`, indexed `token_hash`, `expires_at`, nullable `revoked_at`, and `created_at`.
*Why do we need it?* Login and refresh record the token hash, refresh rejects unknown/revoked/expired hashes, logout revokes the presented hash, and password change/account deletion revoke every active row.
*What breaks without it?* A logout or password change would not invalidate refresh tokens already handed to the browser.
*Think of it as:* a revocable receipt for each refresh token, filed by its fingerprint rather than the token itself.

**What is `EmailTokenType`?**
A `str` enum with `VERIFY = "verify"` and `RESET = "reset"`, stored as a DB enum named `email_token_type`.
*Why do we need it?* It makes the token's purpose explicit and typo-proof at the DB level.
*What breaks without it?* Any string could be stored, so a verify flow could accidentally accept a reset token.
*Think of it as:* color-coded tickets so the staff instantly know which queue you belong in.

**What is `Repo`?**
A model for a tracked repository: `user_id`, `url`, `owner`, `name`, `status` (default `"added"`), a nullable `commit_sha`, `created_at`, with a `UniqueConstraint("user_id", "url")`.
*Why do we need it?* It records which repositories a user added so the pipeline can process them, and `commit_sha` is where the indexed commit will be recorded.
*What breaks without it?* Users can't add repos, and the whole product has no input.
*Think of it as:* a library card listing exactly which books you signed out.

**Why the unique `uq_user_repo_url` constraint?**
It stops the same user adding the same repo URL twice.
*Why do we need it?* Duplicate repos would duplicate expensive cloning/indexing work.
*What breaks without it?* The pipeline would queue the same repo repeatedly.
*Think of it as:* the bouncer who won't let the same guest enter the same party twice.

**What is `backend/app/models/__init__.py` doing?**
It imports and re-exports `User`, `EmailToken`, `EmailTokenType`, and `Repo` via `__all__`.
*Why do we need it?* One import (`import app.models`) registers every model so Alembic sees them all.
*What breaks without it?* A model not imported anywhere would be invisible to autogenerate and silently missing from migrations.
*Think of it as:* a team roster posted at the door so nobody gets forgotten.

---

### Layer 4: Schema Migrations (Alembic)

**What it is:** The version-controlled set of database changes, plus the glue that feeds settings and model metadata into Alembic.
**Why it exists:** So the schema can be created/upgraded/downgraded predictably across machines instead of relying on `create_all()`.
**Files in it:** `backend/alembic.ini` (config, no hardcoded URL), `backend/alembic/env.py` (wires settings + `Base` + models), `backend/alembic/versions/9dbee76d77e4_create_users_email_tokens_repos.py` (creates the three tables), `backend/alembic/versions/09282e667a32_add_commit_sha_to_repos.py` (adds `repos.commit_sha`), `backend/alembic/versions/b7c1f2a9d4e6_add_repo_index_fields.py` (adds `repos.error_message` and `repos.index_summary`), `backend/alembic/versions/c4d8e7a1b2f3_add_refresh_tokens.py` (creates `refresh_tokens`), `backend/alembic/script.py.mako` (template for new migrations), `backend/alembic/README`.
**Depends on:** Layer 1 (Settings), Layer 2 (`Base`), Layer 3 (models so metadata is populated).
**Used by:** developers and deploy steps — nothing above it calls it directly.

#### Study Notes for this layer

**What is `env.py`?**
The script Alembic runs for every command; here it inserts `backend/` on `sys.path`, imports `get_settings`, `Base`, and `app.models`, sets the URL from settings, and sets `target_metadata = Base.metadata`.
*Why do we need it?* It is the bridge between Alembic and the app's real config and models.
*What breaks without it?* Alembic wouldn't know the database URL or which tables exist, so migrations would be wrong or empty.
*Think of it as:* the translator standing between the migration tool and your app, speaking both languages.

**What is `run_migrations_online`?**
The function that builds a real engine from the config and applies migrations against a live connection.
*Why do we need it?* Normal `alembic upgrade` runs need an actual database connection.
*What breaks without it?* You could only ever emit SQL text, never actually change a database.
*Think of it as:* the builder who actually pours the concrete, not just draws the blueprint.

**What is `run_migrations_offline`?**
The variant that configures Alembic with just a URL and prints SQL without a DBAPI.
*Why do we need it?* DBAs sometimes want a SQL script to review or run by hand.
*What breaks without it?* You lose the ability to generate migration SQL without a reachable database.
*Think of it as:* a contractor handing you a printed plan you can execute yourself.

**What is `render_as_batch=True`?**
A setting on `context.configure` that emits "batch" operations for `ALTER TABLE`.
*Why do we need it?* SQLite can't alter columns normally; batch mode recreates tables and works on Postgres too.
*What breaks without it?* Column-changing migrations fail on SQLite.
*Think of it as:* dismantling and rebuilding a LEGO wall to change one brick, because that wall can't be patched in place.

**What is `upgrade()` in the first migration?**
It creates `users`, `email_tokens`, and `repos` with their columns, indexes, foreign keys (`ondelete="CASCADE"`), the `email_token_type` enum, `uq_user_repo_url`, and server defaults (`is_verified=false`, `status='added'`).
*Why do we need it?* It is the actual schema the app will run against.
*What breaks without it?* `alembic upgrade head` produces an empty database and every query fails.
*Think of it as:* the foundation pour for the whole building.

**What is `09282e667a32_add_commit_sha_to_repos.py`?**
The second migration in the chain (`down_revision = 9dbee76d77e4`): it batch-adds a nullable `repos.commit_sha` (`String(64)`) and drops it on downgrade.
*Why do we need it?* The `Repo` model carries `commit_sha`, so the indexed commit can be recorded on the repo row.
*What breaks without it?* The model declares a column the database does not have, so ORM queries fail and `alembic check` reports a pending change.
*Think of it as:* adding one more labelled field to cards already in the filing cabinet.

**What is `b7c1f2a9d4e6_add_repo_index_fields.py`?**
The third migration in the chain (`down_revision = 09282e667a32`): it batch-adds nullable `repos.error_message` (`String(2000)`) for failed indexing and `repos.index_summary` (`JSON`) for the persisted overview.
*Why do we need it?* The background task writes both fields and the summary/status endpoints read them; the ORM and migration must agree.
*What breaks without it?* `alembic upgrade head` leaves columns missing and every indexing write or read fails.
*Think of it as:* adding the result and error boxes to each repo card.

**Why does `downgrade()` drop tables in reverse order?**
It drops `repos`, then `email_tokens`, then `users` (and their indexes).
*Why do we need it?* Foreign keys mean children must go before parents.
*What breaks without it?* Downgrading would fail on constraint violations and leave the DB half-migrated.
*Think of it as:* taking down scaffolding from the top, never pulling the bottom beam first.

---

### Layer 5: Repository Pipeline & Deterministic Analysis

**What it is:** The deterministic half of the product: a safe shallow clone of public GitHub repos with scratch cleanup, an AST index of Python code, a networkx code graph with centrality and reading order, chunking with token counts and a SQLite file-hash cache, and BM25 retrieval over those chunks. Index, graph, chunk and retrieve each ship a `python -m` CLI; clone/index/graph/chunk are also driven by the `app/tasks` background job after `POST /repos/{id}/index`, with commit-SHA cache checks and a persisted summary. BM25 retrieval remains CLI/library-only, and the analysis passes (reader order, retrieval, plan checks, context packing) are still empty packages.
**Why it exists:** The design rule is that deterministic analysis decides what is true; the AI only retrieves, reasons over evidence and explains, and every claim cites `file:line`. Keeping this code separate from `ai/` enforces that, and it must keep working when no AI is available.
**Files in it:** `backend/app/pipeline/clone/{__init__,clone,cleanup,errors,filters,models,redaction}.py`, `backend/app/pipeline/indexer/{__init__,__main__,detect,models,parser,repo}.py`, `backend/app/pipeline/graph/{__init__,__main__,builder,mermaid,models,reading_order}.py`, `backend/app/pipeline/chunking/{__init__,__main__,builder,models,store}.py`, `backend/app/pipeline/retrieval/{__init__,__main__,index,models,queries,tokenizer}.py`, plus `backend/app/pipeline/cache/__init__.py`, `backend/app/analysis/{reader_order,retrieval,plan_checks,packer}/__init__.py` and `backend/app/tasks/__init__.py`.
**Depends on:** Layer 1 (clone size/timeout limits and the retention window come from settings) — and on nothing else at runtime; the pipeline works on source files, not on DB sessions or the ORM.
**Used by:** the CLIs described below, the `app/tasks` background job started by the indexing endpoint, and the FastAPI lifespan, which calls `sweep_stale_clones()` and `mark_stuck_repos_failed()` on startup.

*Built and tested: `clone` (including cleanup), `indexer`, `graph`, `chunking`, `retrieval`, `pipeline/cache` and `tasks`. Retrieval is still CLI/library-only; every `analysis/` package remains empty.*

#### Study Notes for this layer

**What is `pipeline/clone`?**
`safe_clone(url, config)` accepts only `https://github.com/<owner>/<repo>` and shallow-clones it into a per-repo folder under `CLONE_ROOT`, returning a `CloneResult` (url, local path, commit SHA, size, skipped paths). The allow-list rejects other schemes, hosts, credentials, ports, query strings and fragments before git ever runs, so an untrusted URL cannot point the clone at an internal service or inject git options. Before cloning it asks GitHub (best-effort) for the repo size and raises `CloneError("size_exceeded")` when it exceeds `CLONE_MAX_SIZE_MB`; the local size is checked again after cloning, and the clone itself is bounded by `CLONE_TIMEOUT_SECONDS`. `clean_repo` then deletes skipped directories and secret files (`.git`, caches, `.env`, keys…), and the HEAD commit SHA is recorded so later steps can key their output to a commit.
*Why do we need it?* Every downstream step needs a local copy, and an untrusted repo must not be able to fill the disk, hang the process or redirect the clone to an internal host.
*What breaks without it?* Nothing to index, and a huge or malicious repo could exhaust the machine.
*Think of it as:* the delivery truck that also refuses oversized parcels and removes hazardous contents before storage.

**What is `pipeline/clone` cleanup?**
Clones are temporary scratch space: the derived data and the commit SHA are kept, the folder is not. `clone_workspace()` (`cleanup.py`) is a context manager that clones and always deletes the folder in `finally` — on success, exception, timeout, or failed clone. `remove_clone(path, root)` deletes a folder only if it resolves inside the clone root (it refuses the root itself, outside paths and `..` tricks), unlinks symlinks instead of following them, and makes read-only git objects writable so deletion succeeds; a missing folder returns `False`. `sweep_stale_clones(max_age_seconds)` deletes direct child folders of the root older than `max_age_seconds` (mtime), logging and continuing past any single failure. The app runs a sweep once on startup (FastAPI lifespan, `main.py`), wrapped so a sweep error never blocks startup; the retention window comes from `CLONE_STALE_MAX_AGE_SECONDS` (default 3600). Failed, timed-out and oversized clones already remove their own partial folder.
*Why do we need it?* Clones are scratch, not durable state — they must not pile up on disk.
*What breaks without it?* Disk fills with stale clones and orphaned partial folders.
*Think of it as:* wiping the prep counter clean after each dish is plated.

**What is `pipeline/clone/redaction.py`?**
`redact_secrets(text)` replaces credential-shaped values *inside* each line with `[REDACTED]` and returns exactly one output line per input line. It recognizes AWS access keys, Google API keys, GitHub and Slack tokens, OpenAI-style `sk-` keys, JWT-looking strings, PEM private-key blocks (one `[REDACTED]` line per original line) and string literals assigned to names ending in `password`, `passwd`, `secret`, `token`, `api_key`, `apikey`, `auth` or `private_key`. It deliberately leaves `os.getenv`/`os.environ` lookups, empty strings and documentation placeholders such as `changeme`, `<...>` and `xxx` alone. Filename-based stripping in `filters.py` is unchanged; this is the in-line second layer. `build_chunks()` applies it to every stored chunk (including cache hits, with token counts recomputed), and `tasks/__init__.py` applies it to symbol docstrings and signatures before writing `index_summary`, so `file:line` citations stay valid.
*Why do we need it?* Removing whole files is not enough: a real key pasted into a `.py` string would otherwise be persisted in chunks and summaries and could later reach a model.
*What breaks without it?* Stored derived text leaks credentials, and dropping whole lines would shift every later `file:line` citation.
*Think of it as:* blacking out the sensitive words on a photocopy without removing any of the numbered lines.

**What is `pipeline/indexer`?**
`parse_source(source, file)` walks Python's `ast` and produces a `FileIndex`: every function, class and method as a `Symbol` (name, kind, `line_start`/`line_end`, signature, docstring, dotted `parent`), every import as an `ImportRef`, and every call as a `CallRef`. `index_repo(folder)` walks a folder with the ignore rules in `repo.py` (`IGNORED_DIRS`, `IGNORED_FILE_PREFIXES`, `IGNORED_FILE_SUFFIXES`), parses each `.py` file and returns a `RepoIndex`. `detect.py` classifies test files and finds entry points (route decorators, `__name__ == "__main__"` guards, argparse/Click/Typer CLIs), which the graph step uses as the start of the reading order. Analyzed code is parsed, never imported or executed.
*Why do we need it?* Deterministic facts about what exists and where (`file:line`) are the ground truth later claims cite.
*What breaks without it?* Graph, chunk and retrieval steps have nothing structured to work from.
*Think of it as:* a librarian cataloguing every chapter, section and cross-reference without reading the books aloud.

**What is `pipeline/graph`?**
`build_graph(repo_index)` builds a networkx graph whose nodes are module files (`core/config.py`) and symbols (`core/config.py:get_settings`), with `import` edges between modules (resolved through relative and dotted imports) and `call` edges between symbols (resolved through import bindings). It ranks modules by a `CentralityScore` that combines in-degree and PageRank (`score` is the sum of their normalized values), and `reading_order()` walks entry modules breadth-first, following imports, ties broken by centrality, so cycles terminate. `mermaid_diagram()` renders the same graph as Mermaid flowchart text for the UI.
*Why do we need it?* Understanding a codebase means seeing connections and knowing what to read first, not a flat file list.
*What breaks without it?* The workspace has no graph to draw and no defensible reading order.
*Think of it as:* a subway map plus a suggested route from the main station.

**What is `pipeline/chunking`?**
`build_chunks(folder, commit_sha, db_path)` parses every `.py` file with the indexer and creates one `Chunk` per function/class/method: id `file.py:Name:line_start`, the source text with a `# file:line` header, a `tiktoken` `cl100k_base` token count, the file's sha256, and the commit SHA. Class chunks carry the signature, docstring and method names (method bodies live in their own chunks, so no code is stored twice). A chunk over `MAX_TOKENS = 2000` is flagged `too_large` but never split. `ChunkStore` keeps two SQLite tables in `backend/data/chunks.db` (gitignored): `chunks`, keyed by `(commit_sha, chunk_id)` so each commit has its own copy, and `file_cache`, keyed by `(file, file_hash)`, which reuses a file's chunks when its content hash matches instead of re-parsing it.
*Why do we need it?* Retrieval needs symbol-sized pieces with honest size numbers, and re-chunking unchanged files on every run is wasted work.
*What breaks without it?* Retrieval would search raw files, and token budgets for any future model context would be guesses.
*Think of it as:* cutting a book into index cards, with a photocopy log so unchanged pages are never re-cut.

**What is `pipeline/retrieval`?**
`BM25Index(chunks)` builds a `rank_bm25.BM25Okapi` index over one commit's chunks; `search(query, k)` returns ranked `SearchResult`s (id, symbol, kind, file, line range, score, token count). Each chunk's searchable text repeats the symbol name three times and adds the file path, signature, first docstring and body identifiers, which is why exact names usually win. Both indexing and querying use the same `tokenize()`, which lowercases and splits `snake_case`, `camelCase`, acronyms, digits and paths into words. `load_index(commit_sha, db_path)` reads the rows for exactly one commit; `default_commit_sha()` picks the SHA with the most stored chunks. A missing DB, missing table or unknown SHA raises a clear error (`UnknownCommitError` for the last case) instead of crashing.
*Why do we need it?* BM25 is the deterministic baseline: no AI, no embeddings, just keyword ranking over real code, so retrieval is usable and measurable before any model is added.
*What breaks without it?* There is no way to answer "where is this handled?" with a citation.
*Think of it as:* the back-of-the-book index, where an exact term points you at the right page.

**What are the retrieval CLIs and the failure notes?**
`python -m app.pipeline.retrieval "<query>"` prints the commit searched and the top-k chunks; `python -m app.pipeline.retrieval.queries <file>` runs one query per line and prints the top 5 for each. `backend/data/queries.txt` holds the 10 test queries (5 exact names, 5 plain-word ideas) and `backend/data/bm25_failure_notes.md` records, per query, the verified correct answer, the top 3 BM25 results, hit or miss, and why. Result: 7/10 hits at top-3 — 5/5 for exact names (ranks 2, 3, 3, 1, 1) but only 2/5 for plain-word queries. Three patterns are documented: vocabulary mismatch (the query's idea word is absent from the code), generic-word capture plus short-chunk bias (small model/schema classes outrank the real function), and usage chunks outranking definitions (callers contain the dependency's name too). The notes end with "Drafted by the agent, reviewed by me: PENDING".
*Why do we need it?* A baseline is only useful if its failures are measured and written down, because they define what embeddings or reranking must fix later.
*What breaks without it?* "Retrieval works" would be an unverified claim.
*Think of it as:* a lab notebook that records failed experiments next to the successful ones.

**What is `tasks/__init__.py`?**
`run_index_pipeline(repo_id)` is the bridge between the HTTP API and the deterministic pipeline: it moves the repo through `queued → cloning → indexing → ready`, calls `clone_workspace()`, `index_repo()`, `build_graph()` and `build_chunks()`, redacts secret-shaped values in symbol docstrings and signatures, stores `commit_sha` and `index_summary`, logs elapsed seconds per 10k Python lines, and writes a readable `error_message` with `failed` on any exception. `mark_stuck_repos_failed()` repairs repos left in `queued`/`cloning`/`indexing` by a process restart. Deployment note: startup recovery assumes a single process; with multiple workers it can mark jobs that are still live in another worker as `failed`.
*Why do we need it?* The endpoint must return immediately while the slow clone/index work happens outside the request, and the UI needs durable status to poll.
*What breaks without it?* The start endpoint would block the request, and a crash mid-index would leave repos stuck forever.
*Think of it as:* the kitchen that actually cooks the order after the waiter has acknowledged it.

**What is `pipeline/cache`?**
`summary_dict()`, `summary_commit_sha()` and `is_index_current()` decide whether a ready repo already has a stored summary for its exact `commit_sha`; on a hit the task skips cloning and parsing. A changed SHA still reuses `ChunkStore.file_cache` by file hash, so unchanged files are not re-parsed.
*Why do we need it?* Re-cloning and re-indexing the same commit is slow and wasteful.
*What breaks without it?* Repeat runs pay the full cost again (only chunking avoids re-parsing unchanged files).
*Think of it as:* a receipt check that says "this exact batch was already measured".

**What is still reserved in `analysis/*`?**
`analysis/reader_order`, `analysis/retrieval`, `analysis/plan_checks` and `analysis/packer` each contain only an empty `__init__.py`.
*Why do we need them?* Reader order, evidence retrieval, deterministic plan checks and context packing are the next layer above the pipeline.
*What breaks without it?* Those capabilities simply don't exist yet; nothing depends on them today.
*Think of it as:* empty shelves already labelled for the next deliveries.

---

### Layer 6: AI Layer

**What it is:** The folder skeleton reserved for the LLM side — embeddings, prompt templates, model routing, and the agent/tool loop.
**Why it exists:** The design rule says the AI only retrieves, reasons over evidence, and explains; keeping it isolated makes that boundary explicit and lets the rest of the app work when the AI is unavailable.
**Files in it:** `backend/app/ai/embeddings/__init__.py`, `backend/app/ai/prompts/__init__.py`, `backend/app/ai/router/__init__.py`, `backend/app/agent/__init__.py`, and `backend/app/agent/router.py` (the `GET /repos/{repo_id}/agent/trace` stub).
**Depends on:** Layer 5 (deterministic evidence) — by design it must not invent facts on its own.
**Used by:** the future HTTP API.

*Not implemented yet. The `ai/` files are empty `__init__.py` markers; `agent/router.py` only registers the `501` trace stub. No LLM provider is wired — there is no Gemini (or other) client, no API key in `Settings`, and no embeddings are computed anywhere; retrieval is keyword-only (BM25).*

#### Study Notes for this layer

**What is `ai/embeddings`?**
Reserved for turning code/text into vectors for semantic search.
*Why do we need it?* Vector search complements keyword/graph retrieval.
*What breaks without it?* Semantic queries fall back to exact matching only.
*Think of it as:* translating sentences into coordinates so similar ideas sit near each other.

**What is `ai/prompts`?**
Reserved for the prompt templates sent to the model.
*Why do we need it?* Prompts should be versioned and reused, not scattered in code strings.
*What breaks without it?* Prompt changes are untracked and inconsistent.
*Think of it as:* a recipe card the whole kitchen follows.

**What is `ai/router`?**
Reserved for choosing which model/provider handles a request.
*Why do we need it?* Different tasks cost and perform differently across models.
*What breaks without it?* Hardcoding one model with no fallback.
*Think of it as:* a dispatcher sending each call to the best-suited operator.

**What is `agent`?**
Reserved for the loop where the model calls tools over retrieved evidence.
*Why do we need it?* Multi-step reasoning needs a controller, not one-shot prompts.
*What breaks without it?* Only single-shot answers would be possible.
*Think of it as:* a researcher who keeps consulting the library until the question is answered.

---

### Layer 7: Features & HTTP API

**What it is:** The folder skeleton for the FastAPI application: the app object, request/response schemas, security helpers, and the per-feature route modules.
**Why it exists:** It is the top edge the outside world talks to; keeping endpoints grouped by feature keeps routing readable as the app grows.
**Files in it:** `backend/app/main.py` (the app factory, CORS, global error handlers, rate-limit handler, startup recovery, `GET /health` and the `GET /evals` stub), `backend/app/core/email.py` (SMTP sending with a dev console fallback, and verification/reset email helpers), `backend/app/core/ratelimit.py` (the slowapi `Limiter`), `backend/app/schemas/{__init__,common,auth,repo,indexing,stub}.py` (the Pydantic request/response models), `backend/app/security/{__init__,passwords,tokens,email_tokens}.py` (password hashing, JWT, email-token helpers), `backend/app/features/auth/{__init__,dependencies,router}.py` (the complete auth feature), `backend/app/features/repos/{__init__,dependencies,router}.py` (the repo-records feature plus the shared `get_owned_repo` dependency), the live `backend/app/features/indexing/router.py` and `graph_out.py`, and the Part 3–4 stub routers `backend/app/features/{plan,reader,context}/router.py` and `backend/app/agent/router.py`.
**Depends on:** Layers 1–5 (config, DB, models, migrations, the deterministic pipeline); the AI layer is not used yet.
**Used by:** the frontend and any external client.

*Part 1 is complete on the backend. `main.py` defines the app, `GET /health`, the rate-limit handling, startup stale-clone/stuck-repo recovery and the `GET /evals` stub, `schemas/` defines the Part 1 and indexing models plus the documented contract, `security/` implements password hashing, JWT and email-token helpers, `core/email.py` sends mail, `core/ratelimit.py` provides the limiter, `features/auth/` implements every Part 1 auth endpoint, and `features/repos/` implements repo CRUD. `features/indexing/` starts the Layer 5 background pipeline and serves status/summary/graph; the remaining Part 3–4 routers are ownership-checked `501` stubs. The analysis and AI layers above are still empty `__init__.py`.*

#### Study Notes for this layer

**What is `backend/app/main.py`?**
The FastAPI app factory (`create_app()`) plus the module-level `app = create_app()` that uvicorn imports as `app.main:app`. Its lifespan sweeps stale clone folders and marks repos left in `queued`/`cloning`/`indexing` as `failed` with an interruption message.
*Why do we need it?* It builds the ASGI application, attaches CORS, the rate limiter and error handling, registers `GET /health` and `GET /evals`, mounts the auth, repos, indexing and remaining stub routers, and recovers from a restart mid-index.
*What breaks without it?* There is no server to run; `uvicorn app.main:app` cannot start, and interrupted repos stay stuck.
*Think of it as:* the front door of the building — it now exists and opens.

Every failure uses one JSON envelope, `{"error": {"code", "message", "details?"}}`. Plain `HTTPException`s become `http_error`; validation errors become `validation_error` with field details (the raw submitted `input`/`ctx` are stripped); unhandled errors become `internal_error`; rate limits become `http_error` 429. `app/core/errors.py` defines `ApiHTTPException` subclasses whose `code` is copied into that envelope by the global handler. `EmailNotVerifiedError` is the first such code: `/auth/login` keeps a neutral 401 message and returns `code: "email_not_verified"` so the frontend can offer verification without an account-enumeration signal in the text.

**Why `create_app()` as a factory instead of a bare `app`?**
It builds and configures a fresh `FastAPI` instance and returns it, with `app = create_app()` at module level for uvicorn.
*Why do we need it?* Settings, middleware and handlers are applied in one obvious place, and tests can build isolated app instances.
*What breaks without it?* Configuration would be scattered at import time with no clean seam to build or test the app.
*Think of it as:* a recipe for assembling the store before opening, rather than a pre-built store you can't rearrange.

**What is the CORS middleware doing here?**
`add_middleware(CORSMiddleware, ...)` with `allow_origins=settings.CORS_ORIGINS` (plus all methods/headers and credentials). `Settings` rejects `*` in `CORS_ORIGINS` because credentials are always allowed.
*Why do we need it?* The browser frontend is served from a different origin and needs the API to permit it.
*What breaks without it?* The frontend's requests are blocked by the browser's same-origin policy.
*Think of it as:* a guest list at the door naming exactly which websites may call in.

**What are the global exception handlers?**
Handlers for `RequestValidationError` (422), `StarletteHTTPException` (its status code), `RateLimitExceeded` (429), and `Exception` (500), all returning `{"error": {"code", "message", "details"?}}`; validation details drop `input` and `ctx` so submitted values are never echoed.
*Why do we need it?* Every error — including rate limiting — leaves the API in one consistent JSON shape instead of FastAPI's default `{"detail": ...}` or a raw traceback.
*What breaks without it?* Clients would parse several error formats, and unhandled errors could leak internals (the unhandled handler logs the traceback server-side and returns only a generic message).
*Think of it as:* a single standardized complaint form every department must use.

**What is `GET /health`?**
A dependency-free route returning `{"status": "ok"}`.
*Why do we need it?* Load balancers, uptime checks and the team need a cheap liveness probe.
*What breaks without it?* You can't tell at a glance whether the process is up.
*Think of it as:* a doorman answering "yes, we're open" without walking you through the building.

**What is `features/auth`?**
The complete Part 1 auth feature: `router.py` implements `POST /auth/signup`, `POST /auth/verify-email`, `POST /auth/resend-verification`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/change-password`, `DELETE /auth/account`, and `GET /auth/me`; `dependencies.py` provides the `get_current_user` dependency.
*Why do we need it?* Users need accounts, and the `User`/`EmailToken` models exist to support this.
*What breaks without it?* No one can register or log in.
*Think of it as:* the reception desk that issues your badge.

**What does the auth `router.py` do?**
It exposes the auth endpoints on an `APIRouter(prefix="/auth")`. Signup normalizes the email to lowercase, hashes the submitted password on every attempt, and returns the same neutral 201 message whether the account is new or already exists; existing accounts receive a fresh `VERIFY` email and older unused verify tokens are invalidated. `verify-email` looks up the token by its hash and rejects invalid/expired/used tokens (400) before marking the user verified and the token used. `resend-verification` and `forgot-password` generate token material on every request but only persist and send it for a matching account, and both return fixed 200 messages. `login` verifies the password against the stored hash or a dummy hash for unknown users and returns the same 401 message for unknown email, wrong password and unverified accounts; an unverified account with a correct password carries the distinct `email_not_verified` code from `core/errors.py` while the other cases stay `http_error`. Only verified users receive access + refresh tokens, and each refresh JWT has a random `jti`. `refresh` accepts only a refresh token (an access token is rejected 401), consumes the stored unrevoked row with one conditional `UPDATE ... WHERE revoked_at IS NULL AND expires_at > now ... RETURNING id`, and returns a fresh pair; revoked rows are never reactivated, so immediate reuse of the old token fails. `logout` requires a bearer access token and, when `refresh_token` is supplied, revokes that stored refresh token server-side. `reset-password` consumes the token with one conditional `UPDATE ... WHERE used_at IS NULL AND expires_at > now ... RETURNING user_id`, checks that exactly one row was consumed, sets the new hash, revokes all refresh tokens and invalidates all unused `RESET` tokens. `change-password` verifies the current password, rejects reusing the old password, sets the new hash, revokes all refresh tokens and invalidates all unused `RESET` tokens. `delete-account` revokes those tokens and deletes the user (cascading to email tokens and repos). `/auth/me` returns the current user.
*Why do we need it?* It is the concrete account lifecycle the rest of the app is gated behind.
*What breaks without it?* Accounts can't be created, recovered, or managed, so nothing downstream can be owned by a user.
*Think of it as:* the reception desk that checks your ID, issues your badge, hands out reprints, and shreds your file when you leave.

**What is `REQUIRE_EMAIL_VERIFICATION`?**
A boolean setting (default `true`) that keeps the whole verification flow intact while allowing local dev/demo to skip it. When false, signup creates a verified user, sends no email and adds `verification_required: false` to the 201 body so the frontend navigates to login; login never emits `email_not_verified`, `get_current_user` accepts unverified users, and verify-email/resend return 200 "disabled" messages. Startup logs the exact warning `Email verification is DISABLED (dev/demo mode)` once and refuses to start in `APP_ENV=production`/`ENV=prod`.
*Why do we need it?* Demos and local development should not require an SMTP server, but hosting must stay secure by default.
*What breaks without it?* Every dev session needs a real verification email, or someone weakens the code by deleting verification logic.
*Think of it as:* a switch on the reception desk that hands out badges immediately in a rehearsal, but is locked in the production office.

**What is `get_current_user`?**
A FastAPI dependency in `features/auth/dependencies.py` that reads the `Authorization: Bearer <access_token>` header, decodes it as an access token via `decode_token`, loads the `User` by the token's subject, and returns it — raising a 401 `"Not authenticated"` for a missing, malformed, expired, wrong-type token, unknown user or, when `REQUIRE_EMAIL_VERIFICATION=true`, an unverified user.
*Why do we need it?* Protected routes (`/auth/me`, `/auth/logout`, `/auth/change-password`, `/auth/account`, and later repos) need one shared, tested way to turn a header into a user.
*What breaks without it?* Every protected endpoint would re-implement token parsing and could drift or leak different errors.
*Think of it as:* the bouncer who checks your wristband and lets you in as the person it names.

**What is `core/email.py`?**
The email service: `send_email()` sends via SMTP (`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`EMAIL_FROM`), or, when `SMTP_HOST` is unset, logs only the recipient, subject and a "body omitted" warning (the dev fallback never logs tokenized links). `verification_link()`/`send_verification_email()` build and send the verification message; `reset_link()`/`send_reset_email()` do the same for password reset (links point at `FRONTEND_URL`).
*Why do we need it?* Signup, resend and forgot-password must deliver links, but local dev has no mail server.
*What breaks without it?* Emails can't be sent, and these flows can't be tested locally without real SMTP credentials.
*Think of it as:* the mailroom — it posts letters when the post office is configured, and otherwise reads them aloud so you can still act.

**What is `core/ratelimit.py`?**
A slowapi `Limiter(key_func=get_remote_address)` that keys limits by client IP. The auth router decorates signup, login, forgot-password, resend-verification, verify-email, refresh, reset-password, change-password and logout with `@limiter.limit(lambda: get_settings().RATE_LIMIT_*)`, and `main.py` attaches the limiter to `app.state.limiter` and registers a `RateLimitExceeded` handler that returns the standard 429 `http_error` `"Too many requests"` envelope. Limits come from `RATE_LIMIT_*` settings and are read per request. Deployment note: this limiter is in-process, so limits assume a single uvicorn process; multiple workers each keep separate counters unless a shared store is added.
*Why do we need it?* Login/signup/forgot/resend are the endpoints most abused for password guessing and email spam.
*What breaks without it?* Brute-force and enumeration attempts are unthrottled.
*Think of it as:* a turnstile that only lets each visitor through a few times a minute.

**What is `features/repos`?**
The complete repo-records feature: `router.py` implements `POST /repos`, `GET /repos`, `GET /repos/{repo_id}`, and `DELETE /repos/{repo_id}`, all requiring a logged-in user, and `dependencies.py` provides the shared `get_owned_repo` dependency.
*Why do we need it?* It is how a `Repo` row gets created so the pipeline has work.
*What breaks without it?* Users can't submit, view or remove repos, so nothing downstream ever runs.
*Think of it as:* the intake form at the front desk, plus the drawer where your submitted forms are kept.

**What does the repos `router.py` do?**
It exposes the four repo endpoints on an `APIRouter(prefix="/repos", tags=["repos"])`, each depending on `features/auth/dependencies.get_current_user`. `create` takes a `RepoCreate`, re-parses the URL with `parse_github_url`, lowercases `owner`/`name`/`url` (GitHub is case-insensitive), rejects a duplicate for the same user with 409 (checked in code and again via the `uq_user_repo_url` constraint on `IntegrityError`), and inserts a `Repo` with `status="added"`. `list` returns only the current user's rows newest first as `RepoListOut`. `get` and `delete` depend on `get_owned_repo`, so a repo that belongs to another user and a repo that does not exist both return the same 404 and ids cannot be probed. No network call and no cloning happen here — that is Part 2.
*Why do we need it?* It is the whole "save a link" half of Part 1 and the only source of `Repo` rows.
*What breaks without it?* There is no way to give the pipeline a repository.
*Think of it as:* a librarian who records the book you hand over, lists only your shelf, and won't let you pull someone else's book.

**What is `get_owned_repo`?**
A FastAPI dependency in `features/repos/dependencies.py` that depends on `get_current_user` and `get_db`, loads the `Repo` where `id == repo_id` **and** `user_id == current_user.id`, and returns it — or raises 404 `"Repo not found"` for a missing row or one owned by someone else. The repos `get`/`delete` routes and every repo-scoped stub reuse it.
*Why do we need it?* Ownership-scoped lookups appear in many endpoints; centralizing the "mine only, same 404 either way" rule prevents it from drifting and stops id probing.
*What breaks without it?* Each endpoint would repeat the query and could leak whether a foreign repo exists.
*Think of it as:* the librarian's rule — if the card isn't on your shelf, it simply doesn't exist to you.

**What is `features/plan`?**
Part 3's plan feature; for now a stub router (`router.py`) exposing `POST /repos/{repo_id}/plan` (accepts a multipart YAML file) and `GET /repos/{repo_id}/plan`, both returning `501 {"status": "not_implemented"}` after verifying the repo belongs to the caller.
*Why do we need it?* It reserves the plan endpoints so the frontend can wire them now.
*What breaks without it?* The frontend would have no plan routes to call, not even placeholders.
*Think of it as:* a meeting room that is booked and labelled but has no furniture yet.

**What is `features/indexing`?**
Part 2's live indexing feature. `POST /repos/{repo_id}/index` returns 202, sets `status="queued"` and schedules `app.tasks.run_index_pipeline` with FastAPI `BackgroundTasks`; it rejects a second start while the repo is `queued`/`cloning`/`indexing`. `GET .../index/status` returns `status`, `commit_sha` and `error_message`; `GET .../index/summary` returns the persisted file tree, symbol counts, modules, entry points and symbols with `file:line`, or 409 before `ready`. `GET .../graph` reshapes the stored `build_graph()` output into the frontend `Graph` contract (module/class/function nodes with cluster, normalized centrality, `line`, `isEntry`, and typed edges/clusters), is capped at 300 nodes and 1000 edges with `truncated: true`, and also returns 409 before `ready`. All four routes use `get_owned_repo` (401 anonymous, 404 foreign/missing repo). `app/features/indexing/graph_out.py` owns the reshaping; the deterministic builder remains the only source of truth.
*Why do we need it?* It is the API the frontend starts, polls and draws while the pipeline runs.
*What breaks without it?* There is no route to start or watch indexing, and the workspace would have no real code graph.
*Think of it as:* the washing-machine button wired to the machine, with a status light, a printed result sheet and a map of the parts.

**What is `features/context`?**
Part 3's context/query feature; for now a stub router exposing `POST /repos/{repo_id}/context` and `POST /repos/{repo_id}/query` (each a JSON `StubQueryRequest` of `{query, mode}`), returning `501` after an ownership check.
*Why do we need it?* It reserves the context-packing and intent-router endpoints.
*What breaks without it?* Packed context and query routing have no entry points.
*Think of it as:* a service window that is built but has nothing on the counter yet.

**What is `features/reader`?**
Part 3's reader feature; for now a stub router exposing `GET /repos/{repo_id}/reader`, returning `501` after an ownership check.
*Why do we need it?* It reserves the reading-order endpoint.
*What breaks without it?* Reading-order output has no route to be requested.
*Think of it as:* a guided-tour desk that is staffed but has no itinerary yet.

**What is `schemas`?**
The Pydantic request/response models for the API: `common.py` (error/message envelopes), `auth.py` (auth requests including optional `LogoutRequest`, `TokenResponse`, `UserOut`, password rule), `repo.py` (`RepoCreate`/`RepoOut`/`RepoListOut`, GitHub URL parsing), `indexing.py` (`IndexStartOut`, `IndexStatusOut`, `IndexSummaryOut`), `stub.py` (`StubQueryRequest` = `{query, mode}` for the Part 3 stub endpoints), re-exported from `__init__.py`.
*Why do we need it?* ORM models must not leak straight to the API; schemas validate input and shape output.
*What breaks without it?* No input validation or response contracts.
*Think of it as:* customs forms that standardize what can cross the border.

**What is `ErrorResponse` / `MessageResponse`?**
`ErrorResponse` mirrors the app's error envelope (`{"error": {"code", "message", "details?"}}`); `MessageResponse` is a simple `{"message": str}` for confirmations.
*Why do we need it?* They pin the one error shape the handlers in `main.py` already emit and give simple successes a type.
*What breaks without it?* The error contract would live only in handler code, and responses would be untyped.
*Think of it as:* the standard complaint form and the standard receipt.

**What is the password rule?**
`validate_password_strength` (min 8 chars, at least one letter and one digit) applied to `SignupRequest`, `ResetPasswordRequest.new_password`, and `ChangePasswordRequest.new_password`.
*Why do we need it?* Same rule server-side and in the contract, so the frontend can mirror it.
*What breaks without it?* Weak or inconsistent passwords would pass validation.
*Think of it as:* a minimum bar on the door to the club.

**What is `RepoCreate` doing?**
It takes only `url`, validates it is a public `github.com/owner/name` URL (accepting missing scheme, `www.`, trailing slash, `.git`), normalizes it to `https://github.com/owner/name`, and exposes `owner`/`name` as parsed properties.
*Why do we need it?* The client sends a link; the server derives owner/name and rejects non-GitHub links.
*What breaks without it?* Any string could be stored as a repo and owner/name parsing would be duplicated.
*Think of it as:* a form that only accepts library addresses and automatically fills in the branch and shelf.

**What are `RepoOut` / `RepoListOut`?**
`RepoOut` is the wire shape of a repo (`id`, `url`, `owner`, `name`, `status`, `commit_sha`, `error_message`, `created_at`, `from_attributes=True`); `RepoListOut` wraps a list as `{"repos": [...]}`.
*Why do we need it?* It hides `user_id` and lets list and detail responses stay consistent objects.
*What breaks without it?* Internal columns leak and lists have no envelope to grow into.
*Think of it as:* the display card for a repo, and a folder that holds the cards.

**What are the indexing schemas?**
`IndexStartOut` acknowledges a queued job, `IndexStatusOut` is the poll shape (`status`, `commit_sha`, `error_message`), and `IndexSummaryOut` pins the overview payload: commit SHA, file tree, per-kind symbol counts, module reading order, entry points, symbol rows with `file`/`line_start`/`line_end`, chunk/cache counters, graph counts, lines of code and timing.
*Why do we need it?* The summary is stored as JSON on the repo row and must have one stable wire shape.
*What breaks without it?* The frontend would have to guess field names and a corrupt stored summary would leak through unchecked.
*Think of it as:* the printed form the washing machine fills out after each load.

**What is `security`?**
The security helpers: `passwords.py` (`hash_password`, `verify_password` via argon2), `tokens.py` (`create_access_token`, `create_refresh_token`, `decode_token` via PyJWT), and `email_tokens.py` (`generate_email_token`, `hash_token`, `expires_at`, `is_expired`, `is_used`), re-exported from `__init__.py`.
*Why do we need it?* Auth endpoints need safe password hashing, short-lived access/refresh JWTs, and single-use emailed tokens — all in one tested place rather than inline in routes.
*What breaks without it?* Auth logic would be duplicated and error-prone, and tokens/passwords could be handled unsafely.
*Think of it as:* the vault where keys are made, checked and revoked.

**What is `hash_password` / `verify_password`?**
`hash_password` returns an argon2 encoded hash (never the plain password); `verify_password` re-hashes and compares, returning `False` on mismatch or a malformed hash instead of raising.
*Why do we need it?* Passwords are never stored or logged in plain text.
*What breaks without it?* Passwords would be stored insecurely or verification would throw on bad input.
*Think of it as:* a one-way stamp you can check but never read back.

**What is `create_access_token` / `create_refresh_token` / `decode_token`?**
JWTs signed with `SECRET_KEY` (HS256). Access tokens carry `type="access"` and a short `exp`; refresh tokens carry `type="refresh"` and a longer `exp`. `decode_token(token, expected_type)` verifies the signature and expiry and enforces the type, raising `TokenError` otherwise.
*Why do we need it?* An access token must not be usable as a refresh token (or vice versa); type checking prevents that.
*What breaks without it?* A stolen/refreshed token could be replayed in the wrong role.
*Think of it as:* two differently-colored wristbands — valid only for their own door.

**What are the email-token helpers?**
`generate_email_token()` returns `(raw_token, token_hash)` using `secrets.token_urlsafe`; only `token_hash` (SHA-256 hex) is stored in `email_tokens`. `expires_at(type)` gives the lifetime (verify: `VERIFY_TOKEN_EXPIRE_HOURS`, reset: `RESET_TOKEN_EXPIRE_MINUTES`); `is_expired`/`is_used` check the stored timestamps.
*Why do we need it?* Verification and reset links must be single-use and time-limited, and the DB must never hold the raw link token.
*What breaks without it?* Links would be long-lived/reusable, and a DB leak would expose working links.
*Think of it as:* a numbered claim ticket — the stub is checked against the stored copy and expires.

**What are `TokenType` and `TokenError`?**
`TokenType` is the `access`/`refresh` enum embedded in each JWT; `TokenError` is the single exception `decode_token` raises for expired, tampered, wrong-secret, or wrong-type tokens.
*Why do we need it?* Callers get one predictable error type from `decode_token`.
*What breaks without it?* Every caller would have to catch several PyJWT exception classes.
*Think of it as:* one error siren for all bad-token cases.

---

### Layer 8: Frontend

**What it is:** The React + TypeScript + Vite single-page app: landing page, auth pages (signup, login, verify-email, forgot-password, reset-password, account settings), dashboard, repo workspace (2D-by-default code graph with an optional 3D view and Overview/Reader/Plan/Context tabs) and a Developer page.
**Why it exists:** Humans need a UI, and the workspace turns the deterministic graph/evidence into something you can explore; it also keeps all client code out of the backend so the API stays headless.
**Files in it:** `frontend/src/main.tsx` (providers + render), `frontend/src/App.tsx` (routes), `frontend/src/index.css` (design tokens), `frontend/src/api/*` (`client.ts`, `auth.ts`, `repos.ts`, `galaxy.ts`), `frontend/src/mock/*`, `frontend/src/types/*`, `frontend/src/lib/*`, `frontend/src/context/{AuthContext,ToastContext}.tsx`, `frontend/src/components/*` (shared, `ui/` Radix primitives, `landing/`, `auth/`, `dashboard/`, `workspace/` including `OverviewPanel.tsx`), and `frontend/src/pages/*`.
**Depends on:** Layer 7 (HTTP API) — every data call goes through `src/api/`.
**Used by:** end users.

*Built and passing `npm run typecheck`, `npm run lint` (0 warnings) and `npm run build`; no frontend test script is configured. The Dashboard uses one cancellation-guarded `load()` for the initial fetch, Refresh and Retry; the workspace has a Retry for the repo load in addition to graph/summary/status error states. Static pages (landing, Developer, account settings) need no async states because they render local content or submit forms with toast/inline feedback; this is noted in `README.md`. The Part 2 routes in `src/api/galaxy.ts` are live and never use fallback data: `startIndex` calls `POST /repos/{id}/index`, `getIndexStatus` calls `GET .../index/status`, `getIndexSummary` calls `GET .../index/summary`, and `getGraph` calls `GET /repos/{id}/graph` unless `VITE_USE_MOCKS=true` (the opt-in demo default is `false` via `src/lib/env.ts` and `frontend/.env.example`). The dashboard and workspace badges use the backend statuses `queued`/`cloning`/`indexing`/`ready`/`failed`, poll every 2.5s while active, and stop the interval on a terminal status or unmount. The Overview tab renders the real summary only after `ready`; the workspace fetches the graph separately from the repo so a 409 while indexing does not blank the page, and shows explicit loading, error/Retry and empty states plus a "Graph capped for display" note when `truncated`. The three fake query modes still use `src/mock/*`, with fake-evidence badges marked "Not implemented yet".*

*Current limitation:* Reader/Plan/Context still use local mock evidence and are labelled "Not implemented yet"; `RepoWorkspace` unwraps the `{data, demo}` result from `src/api/galaxy.ts` into the `{response, demo}` shape the panels consume, and a `PanelErrorBoundary` around the tab panel keeps any future panel crash from blanking the workspace.

#### Study Notes for this layer

**What is `src/main.tsx`?**
The browser entry: it wraps the app in `MotionConfig reducedMotion="user"`, `BrowserRouter`, `AuthProvider`, `ToastProvider` and `TooltipProvider`, then renders `App` into `#root`.
*Why do we need it?* Every route needs the auth/toast/tooltip context and a single place to honour the user's reduced-motion preference.
*What breaks without it?* No React tree mounts; auth state, toasts and tooltips would be unavailable everywhere.
*Think of it as:* the power switch and fuse box for the whole UI.

**What is `src/App.tsx`?**
The route table: `/` (Landing) and `/verify-email` are public, `/login`, `/signup`, `/forgot-password` and `/reset-password` sit behind `GuestRoute`, and `/dashboard`, `/repo/:id`, `/developer` and `/settings` (account settings) sit behind `ProtectedRoute` inside `AppLayout`; `*` is the 404 page. The navbar's user menu links to `/settings`, and Login links to `/forgot-password`.
*Why do we need it?* It keeps "who can see what" in one place and reuses the navbar shell for signed-in pages.
*What breaks without it?* The app has no navigation, and protected pages wouldn't require a session.
*Think of it as:* the building directory plus the badge-check at each floor.

**What is `src/api/client.ts`?**
The thin `fetch` wrapper: prefixes `VITE_API_URL`, JSON-encodes bodies, attaches the bearer access token, does one refresh-and-retry on a `401`, clears stored tokens when that refresh fails (which makes `AuthContext` set `anonymous` and `ProtectedRoute` redirect to `/login`), parses the backend `{"error": {...}}` envelope into an `ApiError`, and records each call for the Developer page's activity log.
*Why do we need it?* Every request needs the same base URL, auth header, refresh and error handling instead of repeating it per call.
*What breaks without it?* Tokens aren't attached or refreshed, and each caller parses errors differently.
*Think of it as:* the single reception line every request goes through before reaching the API.

**What is `src/api/galaxy.ts`?**
The API boundary. The Part 2 functions (`startIndex`, `getIndexStatus`, `getIndexSummary`, `getGraph`) call the real routes directly and surface errors; `getGraph` returns demo data only when `VITE_USE_MOCKS=true`, otherwise it calls `GET /repos/{id}/graph`. For the endpoints the backend still returns `501` for (`plan`, `reader`, `context`, `query`, `agent/trace`, `evals`) it calls the real route first and, on failure that is not a `401`/`403`, returns typed mock data with `demo: true`; auth errors are rethrown. The catch is broad, so non-`401`/`403` failures of any kind (network, `500`) also become demo data.
*Why do we need it?* The workspace can show real Part 2 data now and still carry labelled placeholders for the unimplemented query modes.
*What breaks without it?* The workspace would show errors everywhere until Parts 3–4 land.
*Think of it as:* a placeholder actor who steps in only when the lead hasn't arrived, with a sign saying so.

**What is `src/api/auth.ts` / `src/api/repos.ts`?**
Typed wrappers over the real endpoints: `signup`, `login`, `verifyEmail`, `resendVerification`, `me`, `logout` (sends the stored refresh token for server-side revocation), `forgotPassword`, `resetPassword`, `changePassword`, `deleteAccount`; and `listRepos`, `createRepo`, `getRepo`, `deleteRepo` (plus `mapRepoStatus`, `isRepoStatusActive` and `REPO_STATUS_LABEL` for the status chip and polling decision).
*Why do we need it?* Screens call small typed functions instead of hand-building requests and mapping wire shapes.
*What breaks without it?* Components would know about URLs and raw JSON shapes.
*Think of it as:* the front desk's list of "the exact forms to fill in" for each service.

**What are the password-recovery and account pages (`src/pages/ForgotPassword.tsx`, `ResetPassword.tsx`, `AccountSettings.tsx`)?**
ForgotPassword posts an email to `POST /auth/forgot-password` and always shows the same "check your email" message, because the backend deliberately does not reveal whether an account exists. ResetPassword reads `?token=` from the URL, validates the new password with the same rules as the backend (`passwordValid`: 8+ characters, one letter, one digit), and posts to `POST /auth/reset-password`. AccountSettings shows the signed-in user from `AuthContext`, changes the password through `POST /auth/change-password`, and deletes the account through `DELETE /auth/account` only after the user types their own email; success clears the session and returns to `/login`.
*Why do we need them?* The backend already exposes these routes, but without pages a user could not recover a password or manage their account from the UI.
*What breaks without it?* Those features are reachable only by calling the API directly.
*Think of it as:* the front-desk forms for "I lost my key", "change my lock", and "close my account".

**What is `src/types/`?**
Shared TypeScript types mirroring the backend (`auth`, `repo`, `api`, `pipeline`) plus UI-only types (`graph`, `query`), including the legacy `INDEX_STAGES` demo list, the live `IndexRunStatus`/`IndexSummary` wire shapes, `INDEX_RUN_STAGES`, and `UiRepoStatus` values that map backend statuses to six chip states.
*Why do we need it?* One typed contract keeps the UI honest about what the API returns.
*What breaks without it?* Shapes drift and mistakes only show up at runtime.
*Think of it as:* the agreed blueprint both sides build to.

**What are the design tokens (`src/index.css` and `src/lib/designTokens.ts`)?**
`index.css` declares the canonical palette in `:root` (surfaces, brand indigo/blue, teal/violet/amber/rose/emerald accents with matching `-tint` surfaces, AA-safe status colors and card elevation) and maps it into Tailwind utilities through `@theme inline`. `designTokens.ts` mirrors those values for SVG/WebGL consumers and derives `STATUS_COLOR` and the node-type hues from the same families. `Card` takes an `accent` prop for the colored top border, and `AccentIcon` renders the tinted icon well.
*Why do we need it?* One palette keeps status badges, plan rings and node types speaking the same color language, and AA ink values keep text readable on the light shell.
*What breaks without it?* Colors drift between panels and the canvas, and small status text fails contrast.
*Think of it as:* the paint chart every room in the building must use.

**What are `src/lib/graphLayout.ts` and `src/lib/graphVisuals.ts`?**
`layoutGraph` groups nodes by their immediate parent folder (or by file when only one folder exists), runs a deterministic bounded force simulation over all visible nodes and edges, centers the result at the origin and returns faint convex hulls for each group. `graphVisuals.ts` derives a display kind (module/function/class/method/route/test) from the wire kind plus the stored summary or file path, and holds the legend colors from the shared `designTokens.ts` palette (bright `graph` hue for the node dot, AA `ink` hue for its chip text). Helpers: `buildAdjacency`, `buildCallCounts` and `positionsForIds`.
*Why do we need it?* The API reports one top-level cluster such as `backend`; without folder-level grouping the graph collapses into a single off-center blob. Both views need one stable, readable picture.
*What breaks without it?* Nodes overlap, labels and hulls hide the graph, and the 2D/3D toggle shows different layouts.
*Think of it as:* an usher who seats every guest by their actual team, not by the building they work in.

**What is the repo workspace (`src/components/workspace/*`)?**
The core screen: `GraphView` defaults to 2D and switches between 2D (`Graph2D`: fitted/centered SVG, faint group hulls, zoom/pan, search, legend, hover/selected neighbor emphasis) / 3D (`Graph3D`, lazy-loaded WebGL with a centered camera and no opaque halos) / List (`GraphList`, Mermaid + module list); `Reset view` restores the fitted camera/viewBox. `ModeTabs` + `ModePanel` switch Overview (`OverviewPanel`), Reader (`ReaderPanel`), Plan (`PlanPanel`) and Context (`ContextPanel`); `CommandBar` is the ⌘K ask box; `StageTimeline` shows queued→cloning→indexing→ready with `failed`, `error_message` and Retry; `NodeInspector` shows a selected node's kind, `file:line`, links, callers and callees; `CodeBlock` renders shiki-highlighted snippets (lazily imported); `CanvasErrorBoundary` falls back to the 2D graph if WebGL fails.
*Why do we need it?* It is where real index evidence becomes explorable: file tree, symbol counts, modules, entry points and `file:line` symbol locations in Overview; mock reading order, plan status colors and packed-context tiers in the not-yet-implemented modes.
*What breaks without it?* The product has data but no way to actually look at it.
*Think of it as:* the control room where you watch and query the codebase.

**What are `StatusDonut.tsx`, `StageTimeline.tsx` and the mock mode panels?**
`StatusDonut` turns plan counts into a conic-gradient ring whose segments use the shared status colors and whose center stays on a solid surface. `StageTimeline` renders queued→cloning→indexing→ready with a green animated current step, green completed steps, a red failed step and a themable progress bar. `ReaderPanel`, `PlanPanel` and `ContextPanel` keep their "Not implemented yet" badge and all existing content, now inside accented cards: a teal query card, a violet status donut, tinted plan items and an amber token-budget card with a teal→emerald bar; evidence stays in `file:line` `CitationChip`s.
*Why do we need it?* The status/evidence language must match between the graph, the timeline and the panels, and the mock modes must stay visibly labelled as placeholders.
*What breaks without it?* Status colors disagree between panels and a failed job looks like a successful one.
*Think of it as:* the same set of traffic lights at every junction.

**What are the dashboard and auth surfaces (`Dashboard.tsx`, `RepoCard.tsx`, `MiniGraphThumb.tsx`, `AuthSplitLayout.tsx`)?**
`RepoCard` pairs a status chip (tinted with the shared status tokens) with a deterministic, token-colored `MiniGraphThumb`; `Dashboard` uses a soft tinted empty state with feature chips and the same "Track repository" action. Landing and the login/signup pages use the brand→violet→teal palette, visible focus rings and 150–200ms hover transitions; `AuthSplitLayout` draws its dark panel gradient from the same tokens.
*Why do we need it?* The first screen a user sees must communicate status at a glance and keep keyboard focus obvious.
*What breaks without it?* Status chips disagree with the rest of the app, the mini graph is an unreadable blur, and focus is invisible.
*Think of it as:* the shop window — the same lighting and signage as the rest of the building.

**What is `OverviewPanel.tsx`?**
The Part 2 evidence tab. It refuses to render symbols until `IndexRunStatus.status` is `ready`, then shows the real `GET .../index/summary` fields: commit SHA, a grid of six accented stat cards (symbols, files, modules, entry points, lines of code, graph edges), symbol counts tinted by node type, modules and entry points in tinted cards, file tree and each symbol's `file:line_start`–`line_end`; loading, empty and error states are explicit and the error state has Retry.
*Why do we need it?* It makes the deterministic index visible without waiting for the AI/query layers.
*What breaks without it?* The user can trigger indexing but cannot see what was actually parsed or where symbols live.
*Think of it as:* the table of contents printed from the index itself.

**What is the Developer page (`src/pages/Developer.tsx`)?**
A page listing every backend endpoint (method, path, Live vs Demo) and a live **API activity** inspector fed by `src/lib/apiLog.ts` (the same log `client.ts` writes to), with a clear button.
*Why do we need it?* It makes which routes are real vs `501` and what the app is actually calling obvious during development.
*What breaks without it?* Debugging "is this live or mock?" means digging through the network tab.
*Think of it as:* a wall of status lights for every door into the API.

---

### Layer 9: Supporting Tooling (Docker, Evals, Scripts)

**What it is:** Local orchestration, evaluation harness, and helper scripts.
**Why it exists:** These support the runtime without being part of the runtime dependency chain.
**Files in it:** `docker/.gitkeep` (the empty `docker-compose.yml` was removed; no Dockerfile yet), `evals/` (folders for agent, context_packer, data, plan_verifier — all `.gitkeep` only), `scripts/.gitkeep`.
**Depends on:** the layers it wraps/tests (any).
**Used by:** developers and CI.

*Not implemented yet. `docker/` holds only `.gitkeep` — there is no compose file or Dockerfile. `evals/` and `scripts/` hold only `.gitkeep` files.*

#### Study Notes for this layer

**What is `docker/`?**
An empty placeholder folder (`.gitkeep` only) reserved for Docker orchestration; the zero-byte `docker-compose.yml` was removed because it described nothing.
*Why do we need it?* It keeps the approved folder structure available for a real compose file and Dockerfile later.
*What breaks without it?* Nothing runs today — the backend and Vite dev server are started directly; there is simply no one-command container setup.
*Think of it as:* an empty shipping container parked in the yard, waiting for the app to be packed into it.

**What is `evals/`?**
The planned home for evaluation harnesses (agent, context packer, plan verifier) and eval data.
*Why do we need it?* It measures quality outside the app package.
*What breaks without it?* No repeatable way to judge output quality.
*Think of it as:* a test kitchen separate from the restaurant.

**What is `scripts/`?**
The planned home for one-off helper scripts.
*Why do we need it?* Keeps ad-hoc tooling out of the app code.
*What breaks without it?* Helpers get scattered and duplicated.
*Think of it as:* the toolbox in the garage.

---

## The Full Flow

Three things run end to end right now: applying the database schema, serving the HTTP API, and indexing a saved GitHub repo through the background pipeline (index → graph → chunk); the pipeline CLIs (including BM25 retrieval) still work over a local folder. First, here is exactly what happens when you run `alembic upgrade head` from `backend/` with the venv active:

1. **Entry (Layer 4).** The `alembic` CLI reads `backend/alembic.ini`, sees `script_location = %(here)s/alembic`, and loads `backend/alembic/env.py`.
2. **Wiring (Layer 4 -> 1/2/3).** `env.py` inserts `backend/` into `sys.path`, then imports `get_settings` (Layer 1), `Base` (Layer 2) and `app.models` (Layer 3). Importing `app.models` runs `models/__init__.py`, which imports `User`, `EmailToken`, `EmailTokenType`, and `Repo`, registering all three tables on `Base.metadata`.
3. **Config (Layer 1).** `get_settings()` reads `backend/.env`, validates it into a cached `Settings`, and returns `DATABASE_URL = "sqlite:///./repotrackr.db"`.
4. **URL + metadata (Layer 4).** `env.py` calls `config.set_main_option("sqlalchemy.url", ...)` with that URL and sets `target_metadata = Base.metadata`.
5. **Engine (Layer 4 -> 2).** `run_migrations_online()` builds an engine via `engine_from_config` and connects.
6. **Migrations (Layer 4).** Alembic compares `alembic_version` against the revision chain and runs, in order, `9dbee76d77e4_create_users_email_tokens_repos.py` (issues `CREATE TABLE` for `users`, `email_tokens`, and `repos`, plus indexes, foreign keys, the `email_token_type` enum, `uq_user_repo_url`, and defaults), `09282e667a32_add_commit_sha_to_repos.py` (batch-adds the nullable `repos.commit_sha` column), and `b7c1f2a9d4e6_add_repo_index_fields.py` (batch-adds nullable `repos.error_message` and `repos.index_summary`), then `c4d8e7a1b2f3_add_refresh_tokens.py` (creates `refresh_tokens` with hashed token, expiry and revocation columns).
7. **Output.** `backend/repotrackr.db` now exists with those tables (and `alembic_version`). `alembic check` then reports "No new upgrade operations detected" because the models match the migration chain.

```
You
 │  `alembic upgrade head` (from backend/, venv active)
 ▼
alembic.ini ────────► alembic/env.py
                         │  imports
                         ├─► app.core.config.get_settings()   [Layer 1]  reads .env
                         ├─► app.core.database.Base           [Layer 2]  engine/Base
                         └─► app.models                       [Layer 3]  User/EmailToken/Repo
                         │
                         ▼
                 run_migrations_online()
                         │  engine_from_config(sqlalchemy.url)
                         ▼
     versions/9dbee76d77e4_...upgrade()  [Layer 4]
                         │  CREATE TABLE users / email_tokens / repos
     versions/09282e667a32_...upgrade()  [Layer 4]
                         │  ALTER TABLE repos ADD commit_sha
     versions/b7c1f2a9d4e6_...upgrade()  [Layer 4]
                         │  ALTER TABLE repos ADD error_message, index_summary
                         ▼
              backend/repotrackr.db  (3 tables + alembic_version)
```

### HTTP request flow (app factory)

When uvicorn imports `app.main:app`, the module builds the app, mounts the auth and repos routers, and serves requests:

1. **Startup (Layer 7).** `uvicorn app.main:app` imports `backend/app/main.py`, which calls `create_app()` and assigns `app = create_app()`. Its lifespan sweeps stale clone folders and marks repos stuck in `queued`/`cloning`/`indexing` as `failed`.
2. **Config (Layer 1).** `create_app()` calls `get_settings()`, which reads `backend/.env` into the cached `Settings`.
3. **Middleware + handlers (Layer 7).** It builds the `FastAPI` object, sets `app.state.limiter`, adds `CORSMiddleware` using `settings.CORS_ORIGINS`, registers the exception handlers (including the 429 rate-limit handler), and calls `app.include_router(...)` for the auth, repos, indexing, plan, reader, context and agent routers to mount `features/*/router.py` and `agent/router.py`. `GET /evals` is declared directly on the app.
4. **Request (`GET /health`).** The route returns `{"status": "ok"}`.
5. **Errors.** A validation error returns 422, an HTTP error (e.g. unknown path -> 404) returns its own status code, a rate-limit breach returns 429, and any unhandled error returns 500 — all in the same `{"error": {"code", "message", ...}}` shape.

```
Browser ──GET /health──► uvicorn ──► app/main.py:app
                                      │ CORS + exception handlers + limiter
                                      ▼
                                    200 {"status":"ok"}
```

### Auth request flow (signup -> verify -> login -> reset)

The auth feature ties Layers 1–4 and 7 together:

1. **Signup (Layer 7).** `POST /auth/signup` validates the body (`SignupRequest`, 422 on a weak password), rejects an existing email (409), hashes the password (`security.hash_password`), inserts an unverified `User` (Layers 2–3, `get_db()`), creates a `VERIFY` `EmailToken` storing only `security.hash_token(raw)` with `security.expires_at("verify")`, then calls `core/email.send_verification_email(email, raw)`. With `SMTP_HOST` set it sends via SMTP; otherwise it logs the link to the console. This endpoint (and forgot-password/resend/login) passes through the `@limiter.limit` check first (429 when exceeded).
2. **Verify (Layer 7).** `POST /auth/verify-email` hashes the submitted token, looks up the matching `VERIFY` `EmailToken`, and rejects it with 400 when missing, used (`is_used`) or expired (`is_expired`). On success it stamps `used_at` and sets the user's `is_verified = True`.
3. **Login (Layer 7).** `POST /auth/login` loads the user by normalized email, checks the password with `security.verify_password` (401 on mismatch), returns 403 while unverified, and otherwise returns `TokenResponse` with `create_access_token(user.id)` and `create_refresh_token(user.id)`.
4. **Refresh (Layer 7).** `POST /auth/refresh` decodes the submitted token as a refresh token (an access token fails), confirms the user still exists and is verified, requires an active stored hash, revokes it and returns a fresh pair; an identical same-second token reactivates the same stored row.
5. **Me / protected routes (Layer 7).** `GET /auth/me` (and `logout`, `change-password`, `DELETE /account`) depend on `features/auth/dependencies.get_current_user`, which decodes the Bearer access token and loads the user.
6. **Forgot / reset (Layer 7).** `POST /auth/forgot-password` always returns the same 200 message; for an existing user it creates a single-use `RESET` token and schedules `core/email.send_reset_email` as a background task. `POST /auth/reset-password` consumes the token with one conditional `UPDATE ... WHERE used_at IS NULL AND expires_at > now`, checks the consumed row count, applies the password rule and sets the new hash.

```
Browser ──POST /auth/signup──► app/main.py:app ──► features/auth/router.py
   201 {message}                                   │ limiter check -> hash pw, save User (get_db)
                                                   │ store EmailToken(hash, exp)
                                                   ▼
                                     core/email.send_verification_email
                                        (SMTP, else console)
Browser ──POST /auth/verify-email──► router ──► mark token used + user verified
Browser ──POST /auth/login───────► router ──► 200 {access_token, refresh_token}
Browser ──POST /auth/refresh─────► router ──► 200 {access_token, refresh_token}
Browser ──POST /auth/forgot-password─► router ──► 200 {message} (+ background reset email)
Browser ──POST /auth/reset-password──► router ──► 200 {message} (token used, pw changed)
Browser ──GET /auth/me (Bearer)──► router ──► dependencies.get_current_user ──► 200 UserOut
```

### Repos request flow (add -> list -> get -> delete)

The repo feature reuses the auth `get_current_user` dependency and the `repos` table (Layers 2–3) and never touches GitHub:

1. **Add (Layer 7).** `POST /repos` authenticates the Bearer token (`get_current_user`), validates the body as `RepoCreate` (`parse_github_url` rejects anything that is not `github.com/owner/name` with 422), lowercases `owner`/`name`/`url`, and rejects a duplicate for that user with 409. Otherwise it inserts a `Repo(user_id, url, owner, name, status="added")`.
2. **List (Layer 7).** `GET /repos` returns the current user's rows newest first as `RepoListOut({"repos": [...]})`.
3. **Get / delete (Layer 7).** `GET /repos/{repo_id}` and `DELETE /repos/{repo_id}` look the row up by `id` **and** `user_id`; a missing row or another user's row returns the same 404. Delete returns `{"message": "Repo deleted."}`.

```
Browser ──POST /repos (Bearer)──► app/main.py:app ──► features/repos/router.py
   201 RepoOut                     │ get_current_user -> parse_github_url
                                   │ lowercase -> duplicate? 409
                                   ▼
                        insert Repo(status="added") via get_db()
Browser ──GET /repos (Bearer)────► router ──► 200 RepoListOut (only my rows, newest first)
Browser ──GET /repos/{id}────────► router ──► 200 RepoOut | 404 (mine only)
Browser ──DELETE /repos/{id}─────► router ──► 200 {message} | 404 (mine only)
```

### Indexing request flow (Part 2)

The index endpoint starts a durable job and returns immediately:

1. **Start (Layer 7).** `POST /repos/{repo_id}/index` depends on `get_owned_repo` (401 without a token, 404 for a foreign/missing repo), rejects a repo already `queued`/`cloning`/`indexing` with 409, sets `status="queued"`, clears `error_message`, and adds `app.tasks.run_index_pipeline(repo.id)` to FastAPI `BackgroundTasks`.
2. **Task (Layer 5 + 7).** `run_index_pipeline` opens its own DB session. On a commit-SHA cache hit it logs `Index cache hit for repo %d at %s` at INFO under the `app` logger and returns to `ready` without cloning. Otherwise it writes `cloning`, clones through `clone_workspace()`, stores `commit_sha`, writes `indexing`, then runs `index_repo()`, `build_graph()` and `build_chunks()`. Chunks and stored symbol docstrings/signatures pass through `redact_secrets()` first. It logs elapsed seconds per 10k Python lines, stores `index_summary`, and writes `ready`. Any exception writes `failed` with a readable `error_message` and removes the clone folder.
3. **Poll (Layer 7).** `GET .../index/status` reads `status`, `commit_sha` and `error_message`. `GET .../index/summary` returns the stored overview only when `status == "ready"`; otherwise it is 409. `GET .../graph` maps the persisted `graph_nodes`/`graph_edges`/`centrality` into the frontend `Graph` shape, caps at 300 nodes / 1000 edges with `truncated`, and is also 409 until `ready`. All three use `get_owned_repo`.

```
Browser ──POST /repos/{id}/index──► router ──► 202 {"status":"queued"}
                                      │ BackgroundTasks
                                      ▼
                          tasks.run_index_pipeline
                            queued → cloning → indexing → ready
                                      │  exception → failed + error_message
Browser ──GET .../index/status────► 200 {status, commit_sha, error_message}
Browser ──GET .../index/summary───► 200 IndexSummaryOut | 409 not ready
Browser ──GET .../graph──────────► 200 GraphOut {nodes, edges, clusters, truncated} | 409 not ready
```

### Stub request flow (Parts 3–4)

Every remaining Part 3–4 endpoint is registered but not implemented, so the frontend can wire it now and get realistic behavior:

1. **Repo-scoped stubs (Layer 7).** `POST`/`GET /repos/{repo_id}/plan`, `GET /repos/{repo_id}/reader`, `POST /repos/{repo_id}/context`, `POST /repos/{repo_id}/query`, and `GET /repos/{repo_id}/agent/trace` each depend on `features/repos/dependencies.get_owned_repo` (so a missing token is 401 and a foreign/missing repo is the same 404) and then return `501 {"status": "not_implemented"}`.
2. **Evals stub (Layer 7).** `GET /evals` is public (no auth, no repo) and also returns `501 {"status": "not_implemented"}`.

```
Browser ──POST /repos/{id}/plan (Bearer)──► app/main.py:app ──► features/plan/router.py
                                │ get_owned_repo: 401 / 404 / else
                                ▼
                     501 {"status": "not_implemented"}
```

### Pipeline flow (local folder -> index -> graph -> chunks -> BM25)

The deterministic pipeline still runs from the shell, one command per step, over a folder on disk (a clone made by `safe_clone`, or any local Python project). The same clone/index/graph/chunk functions are also called by the background task from `POST /repos/{id}/index`; BM25 retrieval remains shell-only and no AI call exists:

1. **Clone (Layer 5).** `safe_clone(url, CloneConfig(root=...))` checks the remote size against `CLONE_MAX_SIZE_MB`, shallow-clones under a timeout, records the HEAD commit SHA, and `clean_repo` deletes skipped directories and secret files. The task calls it through `clone_workspace()`, which always removes the scratch folder; the shell uses it as a library call.
2. **Index (Layer 5).** `python -m app.pipeline.indexer <folder>` walks the folder (applying the ignore rules), parses each `.py` with `ast` via `parse_source`, and builds a `RepoIndex` of symbols, imports and calls with exact line ranges; it prints one row per symbol plus a summary.
3. **Graph (Layer 5).** `python -m app.pipeline.graph <folder>` rebuilds that index in memory, resolves imports and calls into a networkx graph, computes in-degree + PageRank centrality, derives the reading order from the detected entry points, and prints the top central modules, the reading order and a Mermaid diagram.
4. **Chunk + store (Layer 5).** `python -m app.pipeline.chunking <folder> --sha <commit>` creates one chunk per symbol, counts tokens with `tiktoken` `cl100k_base`, and writes to (or reuses from) `backend/data/chunks.db`: a file whose content hash is already in `file_cache` is not re-parsed, and its chunks are stored under the commit SHA in `chunks`. It prints chunk/token totals, cache counts and the largest chunks.
5. **Retrieve (Layer 5).** `python -m app.pipeline.retrieval "<query>"` loads the chunks of one commit (`--sha`, default = the SHA with the most stored chunks), builds a `BM25Index`, and prints the top-k `SearchResult`s. `python -m app.pipeline.retrieval.queries data/queries.txt` runs the same search for the 10 documented test queries.

```
folder (or safe_clone output)
   │  python -m app.pipeline.indexer  <folder>            → RepoIndex (symbols/imports/calls)
   │  python -m app.pipeline.graph    <folder>            → networkx graph + centrality + order
   │  python -m app.pipeline.chunking <folder> --sha <sha>
   │        └── ChunkStore ──► backend/data/chunks.db (chunks + file_cache)
   │  python -m app.pipeline.retrieval "<query>" [--sha <sha>]
   ▼        └── BM25Index ──► ranked SearchResult(file:line, score)
CLI results go to stdout; the HTTP path stores the result on the Repo row
```

Through the HTTP path the task sets `Repo.status`, `Repo.commit_sha`, `Repo.error_message` and `Repo.index_summary`; through the CLI path the same functions only print to stdout. Neither path calls a model.

### Frontend flow (browser -> API -> back)

The React app in `frontend/` talks to Layer 7 through `src/api/`:

1. **Boot (main.tsx).** `main.tsx` mounts the providers and `App.tsx` picks a route. `ProtectedRoute`/`GuestRoute` (`src/components/guards.tsx`) redirect based on the session held in `AuthContext` (tokens in `localStorage` via `src/lib/tokenStorage.ts`).
2. **Auth.** Signup/login/verify call `src/api/auth.ts` -> `src/api/client.ts` -> the real `/auth/*` routes; a successful login stores the token pair in `AuthContext` and `/auth/me` restores the session on reload.
3. **Dashboard.** `Dashboard` calls `listRepos()` (real `GET /repos`) and renders `RepoCard`s with status chips; the track modal calls `createRepo()` (real `POST /repos`). "Index" calls `startIndex()`. While any repo is `queued`/`cloning`/`indexing`, `listRepos()` is refreshed every 2.5s; the interval is cleared when no repo is active or the page unmounts. A `409` from start shows an "Already indexing" toast. Browser verification clicked an enabled Index button after the backend row became `cloning` and confirmed that exact toast.
4. **Workspace.** `/repo/:id` loads the repo (`getRepo`, real) and separately fetches the graph (`getGraph`, real `GET /repos/{id}/graph` unless `VITE_USE_MOCKS=true`), so a 409 while indexing does not blank the page. It polls `getIndexStatus()` every 2.5s only while active; `ready` or `failed` clears the interval, and `ready` also reloads the graph; unmount clears it too. The graph area shows explicit loading, error/Retry and empty states and a capped note when `truncated`. `StageTimeline` renders queued→cloning→indexing→ready, shows `error_message` on `failed`, and Retry calls `startIndex()` again. The status badge uses the same six states on list and detail. `RepoWorkspace` is keyed by the route id so a new repo id gets fresh state; `effectiveStatus` and `currentRepo` are derived during render, and tab queries start from the tab click rather than an effect.
5. **Overview.** When status is `ready`, the Overview tab calls `getIndexSummary()` (real `GET .../index/summary`) and renders the file tree, symbol counts, modules, entry points and `file:line` symbol locations. While not ready it renders no symbols; loading, empty and error states are explicit, and `409`/network errors show a Retry action.
6. **Mock modes.** Only when `VITE_USE_MOCKS=true` does `getGraph` come from `src/mock/*` (labelled demo); the ⌘K query modes for Reader/Plan/Context always come from `src/mock/*` and are labelled "Not implemented yet". Plan colors nodes by check status, Reader highlights the reading order and Context shows the packed tiers. These do not affect Overview.
7. **Activity.** Every call through `client.ts` is appended to the in-memory log in `src/lib/apiLog.ts`, which the Developer page displays live.

```
Browser (frontend/)
  Page/component ──► src/api/*.ts ──► src/api/client.ts ──► VITE_API_URL (Layer 7)
                                              │  Bearer token, 401 refresh-retry, error envelope
                                              ▼
                     Part 2 routes ──► 200/202/409  (rendered directly)
                     other routes  ──► 501  ──► src/api/galaxy.ts falls back to src/mock/
                                              ▼
                                  rendered with a "Not implemented yet" badge
```

## Current Status

Working now (verified by the current 307-test suite; see `docs/changes.md` for step history):
- Settings & Configuration (`app/core/config.py`, `backend/.env`, `backend/.env.example`): `REQUIRE_EMAIL_VERIFICATION` defaults to true; `APP_ENV`/`ENV` gate production startup.
- Database Core (`app/core/database.py`).
- Data Models (`app/models/user.py`, `email_token.py`, `repo.py`, `__init__.py`).
- Schema Migrations — `alembic.ini`, `alembic/env.py`, and three migrations creating `users`, `email_tokens`, `repos`, then adding `repos.commit_sha`, then adding `repos.error_message` and `repos.index_summary`.
- HTTP API app factory (`app/main.py`): `create_app()`, CORS from `CORS_ORIGINS`, the slowapi limiter + 429 handler, global JSON error handlers, `GET /health`, the `GET /evals` stub, startup stale-clone sweep and stuck-repo recovery; runnable via `uvicorn app.main:app`.
- Auth feature (`app/features/auth/router.py`, `app/features/auth/dependencies.py`): `POST /auth/signup`, `POST /auth/verify-email`, `POST /auth/resend-verification`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/change-password`, `DELETE /auth/account`, and `GET /auth/me`, mounted in `main.py`.
- Rate limiting (`app/core/ratelimit.py`, slowapi): per-IP limits on signup, login, forgot-password, resend-verification, verify-email, refresh, reset-password, change-password and logout, configurable via `RATE_LIMIT_*`, returning 429 `http_error`; the limiter assumes a single process.
- Auth hardening: neutral signup/login/resend/forgot responses, a dummy password hash for unknown users, random `jti` plus atomic single-use refresh consumption, revoked refresh rows never reactivated, reset/change invalidating refresh and RESET tokens, `exp` required on JWTs, unverified users blocked by `get_current_user`, validation errors without `input`/`ctx`, and no tokenized links in SMTP fallback logs.
- `REQUIRE_EMAIL_VERIFICATION` (`app/core/config.py`): true keeps every behavior above; false makes signup create a verified user with no email and a `verification_required: false` response field, skips the `email_not_verified` login path and the verified-user guard, and makes verify-email/resend return 200 "disabled" messages. Startup logs `Email verification is DISABLED (dev/demo mode)` once and refuses to start when `APP_ENV=production`/`ENV=prod`.
- Repo-records feature (`app/features/repos/router.py`, `dependencies.py`): `POST /repos`, `GET /repos`, `GET /repos/{repo_id}`, and `DELETE /repos/{repo_id}`, all auth-required and scoped to the current user; new repos get `status="added"`, duplicates per user (case-insensitive) return 409, and another user's or a missing repo returns the same 404.
- Indexing endpoints (`app/features/indexing/router.py`, `app/schemas/indexing.py`, `graph_out.py`): `POST /repos/{repo_id}/index` (202, queued, 409 if already running), `GET .../index/status` (status, commit SHA, error message), `GET .../index/summary` (file tree, symbol counts, modules, entry points, symbols with `file:line`, 409 before ready) and `GET .../graph` (frontend `Graph` from the stored deterministic graph, capped with `truncated`, 409 before ready), all ownership-scoped.
- Background pipeline (`app/tasks/__init__.py`): clone → AST index → graph → chunk in FastAPI `BackgroundTasks`, with `cloning`/`indexing`/`ready`/`failed` transitions, readable errors, clone cleanup, commit-SHA cache hit (INFO-logged and asserted in the regression test), and elapsed-seconds-per-10k-LOC logging. Startup marks repos stuck in `queued`/`cloning`/`indexing` as `failed`.
- Part 3–4 stubs (`app/features/{plan,reader,context}/router.py`, `app/agent/router.py`, `GET /evals`): the remaining not-yet-implemented endpoints are registered. Repo-scoped ones verify ownership via `get_owned_repo` (401 / 404) and then return `501 {"status": "not_implemented"}`; `/evals` is public.
- Safe clone (`app/pipeline/clone/`): `safe_clone` accepts only public GitHub HTTPS URLs, checks the remote size, shallow-clones under a timeout, records the commit SHA and returns a `CloneResult`; `clean_repo` deletes skipped directories and secret files; `redact_secrets` replaces credential-shaped values inside lines with `[REDACTED]` without changing line numbers; `CloneError` carries typed codes. Called by the indexing background task through `clone_workspace()`.
- Clone cleanup (`app/pipeline/clone/cleanup.py`): `clone_workspace()` always deletes the scratch folder in `finally`, `remove_clone()` only deletes paths inside `CLONE_ROOT` and never follows symlinks, and `sweep_stale_clones()` removes stale child folders; the FastAPI lifespan runs one sweep on startup. Configured by `CLONE_STALE_MAX_AGE_SECONDS` (default 3600).
- AST indexer (`app/pipeline/indexer/`): `parse_source`/`parse_file` use `ast` (never import or execute the code) to record symbols with exact `line_start`/`line_end`, signatures, docstrings and parents, plus imports and calls; `index_repo` walks a folder with ignore rules; `detect.py` finds test files and entry points. CLI: `python -m app.pipeline.indexer <folder>`. Covered by 24 tests.
- Code graph (`app/pipeline/graph/`): `build_graph` produces module and symbol nodes with import and call edges, per-module `CentralityScore` (in-degree + PageRank), a breadth-first `reading_order` from entry points, and a Mermaid diagram. CLI: `python -m app.pipeline.graph <folder>`. Covered by 16 tests.
- Chunking + SQLite cache (`app/pipeline/chunking/`): one `Chunk` per symbol with a tiktoken `cl100k_base` token count and a `too_large` flag above 2000 tokens; `ChunkStore` keeps `chunks` (keyed by commit SHA + chunk id) and `file_cache` (keyed by file + sha256) in `backend/data/chunks.db`, so unchanged files are not re-parsed. CLI: `python -m app.pipeline.chunking <folder> [--sha SHA] [--db PATH]`. Covered by 11 tests.
- BM25 retrieval (`app/pipeline/retrieval/`): `BM25Index`/`load_index` rank one commit's stored chunks with `rank_bm25`, using a shared tokenizer that splits identifiers, and return `SearchResult`s with `file:line` and scores. CLI: `python -m app.pipeline.retrieval "<query>" [--k N] [--sha SHA] [--db PATH]`; batch runner: `python -m app.pipeline.retrieval.queries <file>`. Covered by 19 tests.
- Retrieval baseline data: `backend/data/queries.txt` (10 queries: 5 exact names, 5 plain-word ideas) and `backend/data/bm25_failure_notes.md` (per-query correct answer, top 3, hit/miss, reason). Measured result: 7/10 hits at top-3; exact names 5/5 (ranks 2, 3, 3, 1, 1), plain words 2/5; three documented failure patterns (vocabulary mismatch, generic-word/short-chunk bias, usage chunks outranking definitions). Both files live under the gitignored `backend/data/`.
- Email service (`app/core/email.py`): SMTP sending via `SMTP_*`/`EMAIL_FROM` with a console fallback when `SMTP_HOST` is unset; the fallback logs only recipient, subject and a body-omitted warning, and verification/reset link helpers build the tokenized URLs.
- Request/response schemas (`app/schemas/{common,auth,repo,indexing,stub}.py`) and the documented contract (`docs/api_contract.md`, `docs/mock_responses.md`, `docs/openapi.json`, `docs/postman_collection.json`).
- Security helpers (`app/security/{passwords,tokens,email_tokens}.py`): argon2 password hashing with a dummy hash for unknown-user login timing, JWT access/refresh with random refresh `jti`, required `exp` and type-checked `decode_token`, and verify/reset email-token helpers.
- `README.md`: project overview, tech stack, setup from scratch, run/test commands, folder map, docs links, the N/A note for static frontend pages and a Known limitations section. `frontend/README.md` covers the Vite client's env vars, commands, API boundary and state handling.
- Tests (`backend/tests/`): **307 passing** (`python -m pytest -q`), independent of any local `.env` because `conftest.py` sets the full test environment and detaches settings from dotenv before app import — `test_security.py` 18, `test_auth.py` 42, `test_batch1_hardening.py` 13, `test_verification_flag.py` 6, `test_repos.py` 19, `test_stubs.py` 20, `test_indexing.py` 10, `test_graph_endpoint.py` 5, `test_schema_defaults.py` 2, and under `tests/pipeline/`: `test_clone.py` 74, `test_cleanup.py` 16, `test_indexer.py` 24, `test_graph.py` 16, `test_chunking.py` 11, `test_redaction.py` 12, `test_retrieval.py` 19.
- Frontend (Layer 8, `frontend/`): landing page, signup/login/verify-email/forgot-password/reset-password, dashboard (track-repo modal, status chips, live "Index" action), repo workspace (2D-by-default/3D/List graph, Overview/Reader/Plan/Context tabs, ⌘K command bar, real queued/cloning/indexing/ready/failed timeline), Developer page (endpoint catalog + live API activity) and account settings (profile, change password, delete account). `AuthContext` starts anonymous with no token, listens for `rt:auth-invalidated` from `client.ts`, and stops auth-guarded pollers on invalidation; `tokenStorage` bumps a generation on clear so in-flight refresh writes are ignored. `npm run typecheck`, `npm run lint` (0 warnings, 0 errors) and `npm run build` pass; no frontend test script is configured. `MiniGraphThumb` and `PlanPanel` avoid render-scope mutation, and the UI variant helpers stay internal so Fast Refresh works. Part 2 routes, including `/graph`, are live; `VITE_USE_MOCKS=false` by default, and only the Part 3–4 query modes remain labelled mock data. At `lg` and above the workspace keeps a full-height graph beside a 440px side panel (340–640px by drag); below `lg` the graph keeps a 300px-minimum half-screen canvas and the side panel stacks underneath. Tab lists and graph controls scroll or wrap instead of clipping narrow screens. `frontend/README.md` documents the token mirror. `AuthContext.signup` now returns the full `SignupResponse`; `Signup.tsx` uses `verification_required === false` to skip the "Check your email" page and navigate to login.

Not built yet (current absences, not a plan):
- Retrieval is still CLI/library-only: there is no search route (`POST .../query` is a `501` stub), and no LLM/AI layer consumes the chunks.
- Every analysis pass (`app/analysis/{reader_order,retrieval,plan_checks,packer}`) is an empty `__init__.py`.
- AI layer (`app/ai/{embeddings,prompts,router}`) and the agent loop (`app/agent` holds only the `501` trace router): no embeddings, no LLM provider (Gemini included) and no API-key setting.
- Eval set and harnesses (`evals/*` — `.gitkeep` only), Docker orchestration (`docker/` is `.gitkeep` only, no compose file or Dockerfile) and helper scripts (`scripts/` — `.gitkeep` only).

Known open issues (current state):
- Reader/Plan/Context still use mock evidence and are labelled "Not implemented yet"; their `{data, demo}` result is unwrapped before it reaches the panels, and a panel error boundary prevents a future crash from blanking the page.
- The fallback in `src/api/galaxy.ts` still triggers on any non-`401`/`403` failure, so real network or `500` errors in the remaining mock routes render as fake evidence instead of an error state. Part 2 routes have no fallback.
- `docs/api_contract.md`, `docs/openapi.json` and `docs/postman_collection.json` now describe the live Part 2 index routes (`202`/`200`/`409`/`500` where applicable) and their real schemas; only the Part 3–4 routes remain documented as `501` stubs.
- No frontend test script or test files exist; verification is limited to typecheck, lint, production build and source-level responsive checks. No browser runner is configured, so visual hover/focus and pixel-level responsive checks still need a real browser.
- Refresh tokens carry a random `jti` and are consumed once under a conditional update, so even two refreshes in the same second issue different strings and reuse of the old token fails.
- Clone URL allow-list: **fixed**. `safe_clone` (`backend/app/pipeline/clone/clone.py`) accepts public GitHub HTTPS URLs only (`https://github.com/<owner>/<repo>`, `.git` optional) and rejects every other scheme, host, credential, port, query string, fragment, leading `-` or whitespace-bearing URL with `CloneError("invalid_url")`. Local `file://` clones exist only in the test-only helper in `backend/tests/pipeline/test_clone.py`.
- `frontend-redesign` has two commits that are not merged into `phase1`: `0df4d61 feat : done cloning process` and `f041b99 feat : Delete the repo content after final block` (clone cleanup work).

Part 1 status: **backend-complete; frontend complete for the flows it wires up.** Auth, repos, the Part 3–4 stubs, the live Part 2 index API, the error contract, tests, README, and the OpenAPI/Postman docs exist and pass, and the frontend pages (including the repo workspace that opens from a dashboard repo card) are built. The frontend reaches the full auth surface: login links to forgot-password, reset-password reads the emailed token, and the navbar's user menu opens account settings for changing the password or deleting the account. The deterministic indexing path is connected to the API, the `Repo` rows, the Overview tab and the workspace graph (`GET /repos/{id}/graph`, real by default); BM25 retrieval is still CLI-only. Only the Reader/Plan/Context modes remain labelled mock data. Note: to use the frontend against a local backend, add `http://localhost:5173` to `backend/.env`'s `CORS_ORIGINS` (the template defaults to port 3000).


## Running It Locally

Prerequisites:
- Python 3.11+ (the checked-in venv runs Python 3.14.2).
- A virtual environment at `backend/.venv`.

Setup (run from the repo root; all app commands run from `backend/` with the venv active):
```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt        # runtime deps
pip install -r requirements-dev.txt    # also pulls pytest + httpx for tests
```

`requirements-dev.txt` was verified in a fresh virtual environment: installing it resolved every pinned dependency and `python -m pytest -q` reported 307 passing there as well.

Environment variables:
- Copy the template and edit it: `cp .env.example .env`
- Required: `SECRET_KEY` (no default). Generate one with:
  `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- Others (all have defaults): `APP_NAME`, `ENV`, `APP_ENV` (`dev`; `production`/`prod` blocks verification-off startup), `REQUIRE_EMAIL_VERIFICATION` (`true`), `DATABASE_URL`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `VERIFY_TOKEN_EXPIRE_HOURS`, `RESET_TOKEN_EXPIRE_MINUTES`, `RATE_LIMIT_LOGIN`, `RATE_LIMIT_SIGNUP`, `RATE_LIMIT_FORGOT_PASSWORD`, `RATE_LIMIT_RESEND_VERIFICATION`, `FRONTEND_URL`, `CORS_ORIGINS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `CLONE_ROOT` (`data/clones`), `CLONE_MAX_SIZE_MB` (200), `CLONE_TIMEOUT_SECONDS` (120), `CLONE_STALE_MAX_AGE_SECONDS` (3600).

Create/verify the database (from `backend/`):
```bash
alembic upgrade head      # creates backend/repotrackr.db with users, email_tokens, repos
alembic check             # verifies models match the migration
alembic downgrade base    # rolls the schema back (drops the tables)
```

How to verify it works:
- After `alembic upgrade head`, `backend/repotrackr.db` should exist.
- `alembic check` should say there are no new upgrade operations.
- Sanity-check config: `python -c "from app.core.config import get_settings; print(get_settings().APP_NAME)"`.

Run the API (from `backend/`, venv active):
```bash
uvicorn app.main:app --reload        # serves http://127.0.0.1:8000
curl http://127.0.0.1:8000/health    # -> {"status":"ok"}
```
Swagger UI is at `http://127.0.0.1:8000/docs` (endpoints grouped by tag: `system`, `auth`, `repos`, `indexing`, `stubs`) and the raw spec at `/openapi.json` (also exported to `docs/openapi.json`). `GET /health` answers as long as the app imports. The full auth surface is live under `/auth` (`signup`, `verify-email`, `resend-verification`, `login`, `refresh`, `logout` (optional `refresh_token` body revokes that token server-side), `forgot-password`, `reset-password`, `change-password`, `account`, `me` — see `docs/api_contract.md`), and repo CRUD is live under `/repos` (`POST`, `GET`, `GET /{id}`, `DELETE /{id}`, all requiring a Bearer token). The Part 2 routes are live under `/repos/{repo_id}/index` (`POST` 202 `{"status":"queued","message":"Indexing queued."}`, 409 when already running; `GET .../status` 200; `GET .../summary` 200 only when ready, otherwise 409/500 for invalid stored data) and `/repos/{repo_id}/graph` (frontend `Graph` mapped from the stored deterministic graph, capped at 300 nodes / 1000 edges with `truncated`, 409 before ready). The Part 3–4 routes (plan, reader, context, query, agent/trace, evals) remain registered stubs returning `501 {"status": "not_implemented"}`; repo-scoped ones still enforce the same 401/404 rules. With `SMTP_HOST` empty in `.env`, the fallback logs only the recipient and subject; raw verification/reset tokens are never printed, so local verification uses the dev flow described in the auth layer notes instead of reading links from logs.

Run the tests (from `backend/`, venv active):
```bash
python -m pytest tests/ -q                        # 307 passing
python -m pytest tests/test_security.py -q        # 18
python -m pytest tests/test_auth.py -q            # 42
python -m pytest tests/test_batch1_hardening.py -q # 13
python -m pytest tests/test_repos.py -q           # 19
python -m pytest tests/test_stubs.py -q           # 20
python -m pytest tests/test_indexing.py -q        # 10
python -m pytest tests/test_graph_endpoint.py -q  # 5
python -m pytest tests/test_schema_defaults.py -q # 2
python -m pytest tests/pipeline/ -q               # 172 (clone 74, cleanup 16, indexer 24, graph 16, chunking 11, redaction 12, retrieval 19)
```

Run the deterministic pipeline (from `backend/`, venv active; output to stdout only):
```bash
python -m app.pipeline.indexer ../some-folder          # kind | name | file:line + summary
python -m app.pipeline.graph ../some-folder            # central modules, reading order, Mermaid
python -m app.pipeline.chunking ../some-folder --sha <commit-sha>
python -m app.pipeline.retrieval "parse_github_url" -k 5
python -m app.pipeline.retrieval.queries data/queries.txt
```
The chunk store defaults to `backend/data/chunks.db` (gitignored; `--db` overrides it). Retrieval's `--sha` defaults to the commit with the most stored chunks. `safe_clone` has no CLI: it is a library call that takes a `CloneConfig(root=..., max_size_mb=..., timeout_seconds=...)`; the HTTP API invokes it through `app.tasks.run_index_pipeline` inside `clone_workspace()`. None of these commands updates the `repos` table or the API.

Run the frontend (from `frontend/`, Node 20+):
```bash
npm install
cp .env.example .env        # optional; VITE_API_URL defaults to http://localhost:8000, VITE_USE_MOCKS to false
npm run dev                 # Vite dev server on http://localhost:5173
npm run typecheck           # tsc -b --noEmit
npm run build               # production build (3D canvas + Mermaid are code-split)
npm run lint                # oxlint
```
Start the backend first (from `backend/`, venv active) with `uvicorn app.main:app --reload`. The Vite dev server runs on port **5173**, so add `http://localhost:5173` (and `http://127.0.0.1:5173`) to `CORS_ORIGINS` in `backend/.env` or the browser will block the API calls. The workspace's reader, plan and context views show a "Demo data" badge until the Part 3–4 endpoints stop returning `501`; the graph is real unless `VITE_USE_MOCKS=true`.

## Current verification

- Backend (venv active, from `backend/`): `python -m pytest -q` → 307 passed, 10 warnings; `alembic check` → "No new upgrade operations detected."; `alembic current` → `c4d8e7a1b2f3 (head)`.
- Real Part 2 API E2E on a temporary migrated database and clone root against `https://github.com/keleshev/schema`: verified user → login → `POST /repos` → `POST /repos/{id}/index` (202) → status → summary → graph. Pre-ready summary and graph returned 409; final status was `ready`. Summary numbers: 20 file-tree entries, 4 files indexed/cached, 216 symbols (22 class / 142 function / 52 method), 3,335 lines of code, 220 graph nodes, 266 graph edges, 4 centrality rows, 1 entry point, `index_seconds` 1.953 and `seconds_per_10k_loc` 5.856. The graph endpoint returned 220 nodes, 266 edges, 2 clusters and `truncated: false`. FastAPI's `TestClient` runs background tasks before returning the 202, so polling observed only the terminal `ready` status.
- Frontend: `npm run typecheck` clean, `npm run lint` 0 warnings / 0 errors, `npm run build` succeeds with only the pre-existing large-chunk advisory. No browser automation runner is installed; UI confirmation is manual.

## Where You Can Help

- **Layer 8, `frontend/`:** the client is built; when a Part 3–4 endpoint stops returning `501`, remove its entry from the mock fallback in `src/api/galaxy.ts` (and its "Demo data" badge will disappear automatically) or replace the `501` handling with the real shape.
- **Layer 7, `app/main.py`:** the app factory includes auth, repo CRUD, live Part 2 indexing and the Part 3–4 stubs — replace the remaining stubs with real routers and extend middleware as features are built.
- **Layer 7, `app/security/`:** helpers exist and are tested — extend them (e.g. token rehash checks) as auth needs grow.
- **Layer 7, `app/schemas/`:** schemas for Part 1 exist (plus `stub.py`) — extend them (and `docs/api_contract.md`/`docs/mock_responses.md`/`docs/openapi.json`/`docs/postman_collection.json`) when endpoints change.
- **Layer 7, `app/features/auth/`:** the full Part 1 auth surface (signup/verify/resend/login/refresh/logout/forgot/reset/change/delete/me) plus rate limiting is built; refresh tokens are stored as SHA-256 hashes and revoked on logout, password change and account deletion; `get_current_user` is reused by the repos feature and every repo-scoped stub.
- **Layer 7, `app/core/ratelimit.py`:** limits exist for the abuse-prone auth endpoints — add them to other sensitive endpoints and consider a shared storage (Redis) for multi-process deploys.
- **Layer 7, `app/features/repos/`:** repo CRUD plus `get_owned_repo` are built; Part 2 flips `status` through the pipeline instead of leaving it at `"added"`.
- **Layer 7, stub routers:** `app/features/{plan,reader,context}/router.py` and `app/agent/router.py` return `501`; implement them in Parts 3–4 (they already enforce ownership). `app/features/indexing/router.py` is live.
- **Layer 2/3:** register a second model change by adding a model then running `alembic revision --autogenerate`; test `render_as_batch` behavior on SQLite.
- **Layer 5, `app/pipeline/`:** clone (with cleanup and redaction), indexer, graph, chunking, BM25 retrieval and `pipeline/cache` are tested library + CLI code, now wired to `app.tasks.run_index_pipeline` and the Part 2 endpoints. Next work is additional retrieval endpoints or more languages, not basic HTTP wiring.
- **Layer 5, `app/analysis/retrieval`:** make sure every future AI claim can attach a real `file:line`, per the design rule.
- **Layer 9:** add a real `docker/docker-compose.yml` and a Dockerfile; stand up the `evals/` harnesses.
- **Tests:** the backend suite has 307 passing tests covering security, auth hardening, the verification flag, repos, stubs, indexing/graph endpoints and `tests/pipeline/*` — extend it (e.g. `Settings` validation, `get_db()` lifecycle, migration up/down, browser-level UI checks).

## How To Contribute

Fork and branch:
- Fork the repo, then create a branch for the step you're doing. This repo names work by step, so follow that: `step-1d-app-factory`, `step-2a-clone`, etc.
- Keep changes scoped to one step/layer; don't build ahead (see `AGENTS.md`).

Commit style (matches existing history):
- Prefix with the step, then a short description: `Step 1C: Alembic and first migration`, `Step 1B: Database session and models`, `Step 1A: venv, pinned requirements, config`.
- One logical change per commit.

PR checklist:
- [ ] The code actually runs (verify, don't assume).
- [ ] Public names are real, typed, and consistent with existing files.
- [ ] If env vars/endpoints/migrations changed, they're reflected in `backend/.env.example` and `docs/changes.md`.
- [ ] Every new claim-bearing feature cites `file:line` (design rule).
- [ ] No secrets committed (`backend/.env`, `*.db` stay gitignored).
- [ ] `docs/changes.md` gets a new entry (step, date, files, why, new commands/env/endpoints/migrations, known issues).

Code conventions already used in the repo:
- Python type hints everywhere, including SQLAlchemy 2.0 typed mappings (`Mapped[...]`, `mapped_column(...)`).
- Timezone-aware datetimes via `datetime.now(timezone.utc)`.
- `snake_case` for files/functions, `PascalCase` for classes, `UPPER_SNAKE_CASE` for settings and enum members.
- Config via the cached `get_settings()`, never raw `os.environ`; DB sessions via `get_db()`.
- Packages expose their public API through `__init__.py` with `__all__` (see `app/models/__init__.py`).
- Keep deterministic code (`pipeline/`, `analysis/`) separate from LLM code (`ai/`, `agent/`).
- Add any dependency to `backend/requirements.txt` before installing it.
