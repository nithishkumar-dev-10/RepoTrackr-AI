# Project Summary

## What This Project Is
RepoTrackr AI is a backend-first tool for ingesting GitHub repositories and reasoning about them: it clones a repo, builds a deterministic index and static analysis of the code, and only then lets an AI layer explain things on top of that evidence. The backend has settings, the database engine, the SQLAlchemy models, two Alembic migrations, and a FastAPI app that serves `GET /health` plus a complete email/password auth flow (signup, email verification, resend, login, token refresh, logout, forgot/reset/change password, delete account, and `GET /auth/me`) with per-IP rate limiting on the abuse-prone endpoints, CORS, and consistent JSON error handling, plus a repo-records feature (add, list, get, delete a saved GitHub link, with duplicate blocking). Every Part 2–4 endpoint is also registered as a stub that verifies repo ownership and returns `501 {"status": "not_implemented"}`, so the frontend is already wired. A complete React + TypeScript + Vite frontend lives in `frontend/`: a landing page, signup/login/verify-email, a dashboard, a repo workspace (dark 3D code-graph canvas with an interactive Reader/Plan/Context panel and a ⌘K command bar) and a Developer page; it calls the real endpoints and falls back to clearly-badged "Demo data" for the `501` ones.

The deterministic half is partly built, but only as library code and command-line tools — no HTTP route reaches it yet. `app/pipeline/clone/` performs a safe shallow clone with size/timeout limits and secret/junk cleanup; `app/pipeline/indexer/` parses Python source with `ast` into symbols, imports and calls; `app/pipeline/graph/` turns that index into a networkx module/symbol graph with PageRank centrality, a suggested reading order and a Mermaid diagram; `app/pipeline/chunking/` cuts the index into one chunk per function/class/method, counts tokens with `tiktoken` and caches chunks per file hash in SQLite; and `app/pipeline/retrieval/` ranks those stored chunks with BM25. `app/analysis/*`, `app/ai/*`, `app/agent` and `app/tasks` are still empty packages: there is no LLM provider (Gemini or otherwise), no embeddings, no eval set, and no background job runner.

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
│   │       └── 09282e667a32_add_commit_sha_to_repos.py          # Adds repos.commit_sha
│   ├── app/
│   │   ├── __init__.py              # Empty package marker
│   │   ├── main.py                  # FastAPI app factory: create_app(), CORS, error handlers, GET /health
│   │   ├── core/
│   │   │   ├── __init__.py          # Empty package marker
│   │   │   ├── config.py            # Settings class + cached get_settings()
│   │   │   ├── database.py          # Engine, Base, SessionLocal, get_db()
│   │   │   ├── email.py             # send_email (SMTP/dev console), verify + reset email helpers
│   │   │   └── ratelimit.py         # slowapi Limiter (per-IP) used by auth endpoints
│   │   ├── models/
│   │   │   ├── __init__.py          # Re-exports User, EmailToken, Repo
│   │   │   ├── user.py              # User table + relationships
│   │   │   ├── email_token.py       # EmailToken table + EmailTokenType enum
│   │   │   └── repo.py              # Repo table
│   │   ├── schemas/
│   │   │   ├── __init__.py          # Re-exports all schemas
│   │   │   ├── common.py            # ErrorDetail, ErrorResponse, MessageResponse
│   │   │   ├── auth.py              # Auth request/response schemas + password rule
│   │   │   ├── repo.py              # RepoCreate/RepoOut/RepoListOut + GitHub URL parse
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
│   │   │   ├── indexing/router.py   # Stubs: POST /repos/{id}/index + status/summary (501)
│   │   │   ├── context/router.py    # Stubs: POST /repos/{id}/context + /query (501)
│   │   │   └── reader/router.py     # Stub: GET /repos/{id}/reader (501)
│   │   ├── pipeline/
│   │   │   ├── __init__.py          # Empty package marker
│   │   │   ├── clone/
│   │   │   │   ├── __init__.py      # Re-exports safe_clone, clean_repo, models, errors
│   │   │   │   ├── clone.py         # safe_clone: shallow clone, size/timeout limits, slug, SHA
│   │   │   │   ├── errors.py        # CloneError + error codes (invalid_url, size_exceeded, …)
│   │   │   │   ├── filters.py       # is_skipped_dir, is_secret_file, clean_repo
│   │   │   │   └── models.py        # CloneConfig, CloneResult
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
│   │   │   └── cache/__init__.py    # Empty — clone/index cache (not built)
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
│   │   └── tasks/__init__.py        # Empty — background jobs
│   ├── data/                        # Runtime artifacts (gitignored)
│   │   ├── chunks.db                # SQLite: chunks + file_cache (written by chunking)
│   │   ├── queries.txt              # The 10 BM25 test queries (5 names, 5 plain-words)
│   │   └── bm25_failure_notes.md    # Per-query findings and failure patterns
│   └── tests/
│       ├── __init__.py              # Test package marker
│       ├── conftest.py              # Test env vars + temp DB, TestClient and fixtures
│       ├── test_security.py         # Security unit tests (18)
│       ├── test_auth.py             # Auth endpoint tests (37)
│       ├── test_repos.py            # Repo CRUD endpoint tests (19)
│       ├── test_stubs.py            # Part 2-4 stub tests, 501 / 401 / 404 (29)
│       └── pipeline/
│           ├── __init__.py          # Test package marker
│           ├── conftest.py          # Shared pipeline fixtures (temp repos, git helpers)
│           ├── test_clone.py        # safe_clone + filters/limits (29)
│           ├── test_indexer.py      # AST parsing, symbols, imports, calls (24)
│           ├── test_graph.py        # graph building, centrality, reading order (16)
│           ├── test_chunking.py     # chunks, token counts, cache (11)
│           └── test_retrieval.py    # tokenizer, BM25 ranking, queries runner (19)
├── docker/
│   └── docker-compose.yml           # Empty; no Dockerfile yet
├── docs/
│   ├── RepoTrackr-AI-Execution-Plan.md  # Source-of-truth roadmap (Parts 1-4)
│   ├── project_summary.md           # This file (canonical)
│   ├── api_contract.md              # Endpoint contract for Parts 1-4
│   ├── mock_responses.md            # Example JSON for frontend mocks
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
│   ├── .env.example                 # VITE_API_URL template (a real .env is gitignored)
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
│       ├── api/                     # client.ts, auth.ts, repos.ts, galaxy.ts (mock-fallback boundary)
│       ├── mock/                    # Typed mock data for the 501 endpoints
│       ├── types/                   # Wire + UI types (auth, repo, graph, query, pipeline, api)
│       ├── lib/                     # env, tokenStorage, motion, validation, authErrors, github,
│       │                            #   graphLayout, planStatus, endpoints, apiLog, utils
│       ├── context/                 # AuthContext, ToastContext
│       ├── components/              # shared (GlowCard, GlowButton, GlowRipple, …) + ui/ (Radix)
│       │                            #   + landing/ + auth/ + dashboard/ + workspace/
│       └── pages/                   # Landing, Signup, Login, VerifyEmail, Dashboard,
│                                    #   RepoWorkspace, Developer, NotFound
└── scripts/
    └── .gitkeep                     # Empty — helper scripts
```

## The Stack at a Glance
Settings -> Database Core -> Data Models -> Schema Migrations (Alembic) -> Pipeline & Analysis -> AI Layer -> Features & HTTP API -> Frontend, with Docker/Evals/Scripts as supporting tooling.

(Layers 1–4 are fully built. Layer 7 has its app factory, `GET /health`, the complete auth feature with rate limiting, the repo-records feature (add/list/get/delete), the Part 2–4 stub endpoints, the Pydantic schemas, the endpoint/mock/OpenAPI/Postman contract, and the `security` helpers (password hashing, JWT, email tokens), plus unit and endpoint tests. Layer 8 (the frontend) is built and talks to Layer 7. Layer 5 is partly built: `pipeline/clone`, `pipeline/indexer`, `pipeline/graph`, `pipeline/chunking` and `pipeline/retrieval` exist and are covered by tests, but they are only reachable as library calls and CLIs — `pipeline/cache`, all of `analysis/` and `tasks/` are still empty packages, and no HTTP endpoint runs them. Layer 6 (AI) is still an empty skeleton, and its endpoints — like the pipeline's — are the `501` stubs the frontend renders as "Demo data".)

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

**What it is:** The SQLAlchemy ORM classes that define the `users`, `email_tokens`, and `repos` tables and their relationships.
**Why it exists:** Separating the table definitions from the engine and from request schemas keeps the persistence shape in one obvious place.
**Files in it:** `backend/app/models/user.py` (`User`), `backend/app/models/email_token.py` (`EmailToken`, `EmailTokenType`), `backend/app/models/repo.py` (`Repo`), and `backend/app/models/__init__.py` (re-exports all three + the enum).
**Depends on:** Layer 2 (`Base`).
**Used by:** Schema Migrations (metadata for autogenerate) and all future feature/API code.

#### Study Notes for this layer

**What is `User`?**
The model for a person: `id`, unique indexed `email`, `password_hash`, `is_verified`, and timezone-aware `created_at`.
*Why do we need it?* It is the anchor record every email token and repo hangs off.
*What breaks without it?* There is no owner for tokens or repos and no way to authenticate anyone.
*Think of it as:* the account card at the top of every other document in a filing cabinet.

**What are the `User` relationships?**
`email_tokens` and `repos` are `relationship(...)` lists with `cascade="all, delete-orphan"` and `passive_deletes=True`.
*Why do we need it?* They let you reach a user's tokens/repos in Python and define what happens on delete.
*What breaks without it?* Deleting a user would not clean up children (or would do it inefficiently in Python instead of the DB).
*Think of it as:* closing your account and having the bank automatically shred all linked statements.

**What is `EmailToken`?**
A model storing a hashed one-time token per user: `user_id`, `type`, `token_hash` (indexed), `expires_at`, `used_at`.
*Why do we need it?* Email verification and password reset both need short-lived, single-use tokens.
*What breaks without it?* Password reset and email verification have nowhere to store/validate their tokens.
*Think of it as:* a numbered claim ticket you swap for a service, then it's stamped used.

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
**Files in it:** `backend/alembic.ini` (config, no hardcoded URL), `backend/alembic/env.py` (wires settings + `Base` + models), `backend/alembic/versions/9dbee76d77e4_create_users_email_tokens_repos.py` (creates the three tables), `backend/alembic/versions/09282e667a32_add_commit_sha_to_repos.py` (adds `repos.commit_sha`), `backend/alembic/script.py.mako` (template for new migrations), `backend/alembic/README`.
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

**Why does `downgrade()` drop tables in reverse order?**
It drops `repos`, then `email_tokens`, then `users` (and their indexes).
*Why do we need it?* Foreign keys mean children must go before parents.
*What breaks without it?* Downgrading would fail on constraint violations and leave the DB half-migrated.
*Think of it as:* taking down scaffolding from the top, never pulling the bottom beam first.

---

### Layer 5: Repository Pipeline & Deterministic Analysis

**What it is:** The deterministic half of the product: a safe shallow clone, an AST index of Python code, a networkx code graph with centrality and reading order, chunking with token counts and a SQLite file-hash cache, and BM25 retrieval over those chunks. Index, graph, chunk and retrieve each ship a `python -m` CLI; the clone is library-only, and none of them is reachable over HTTP yet. The remaining folders — the clone/index cache, the analysis passes (reader order, retrieval, plan checks, context packing) and the background jobs — are still empty packages.
**Why it exists:** The design rule is that deterministic analysis decides what is true; the AI only retrieves, reasons over evidence and explains, and every claim cites `file:line`. Keeping this code separate from `ai/` enforces that, and it must keep working when no AI is available.
**Files in it:** `backend/app/pipeline/clone/{__init__,clone,errors,filters,models}.py`, `backend/app/pipeline/indexer/{__init__,__main__,detect,models,parser,repo}.py`, `backend/app/pipeline/graph/{__init__,__main__,builder,mermaid,models,reading_order}.py`, `backend/app/pipeline/chunking/{__init__,__main__,builder,models,store}.py`, `backend/app/pipeline/retrieval/{__init__,__main__,index,models,queries,tokenizer}.py`, plus `backend/app/pipeline/cache/__init__.py`, `backend/app/analysis/{reader_order,retrieval,plan_checks,packer}/__init__.py` and `backend/app/tasks/__init__.py`.
**Depends on:** Layer 1 (clone size/timeout limits come from settings) — and on nothing else at runtime; the pipeline works on source files, not on DB sessions or the ORM.
**Used by:** the CLIs described below; Layer 6 and Layer 7 are the intended consumers, but no code calls the pipeline from the API yet.

*Built and tested: `clone`, `indexer`, `graph`, `chunking`, `retrieval`. Not built: `pipeline/cache`, every `analysis/` package and `tasks/` — each holds only an empty `__init__.py`, and none of the pipeline functions is called from an HTTP route.*

#### Study Notes for this layer

**What is `pipeline/clone`?**
`safe_clone(url, config)` shallow-clones a GitHub repo into a per-repo folder under `CLONE_ROOT` and returns a `CloneResult` (url, local path, commit SHA, size, skipped paths). Before cloning it asks GitHub (best-effort) for the repo size and raises `CloneError("size_exceeded")` when it exceeds `CLONE_MAX_SIZE_MB`; the local size is checked again after cloning, and the clone itself is bounded by `CLONE_TIMEOUT_SECONDS`. `clean_repo` then deletes skipped directories and secret files (`.git`, caches, `.env`, keys…), and the HEAD commit SHA is recorded so later steps can key their output to a commit.
*Why do we need it?* Every downstream step needs a local copy, and an untrusted repo must not be able to fill the disk or hang the process.
*What breaks without it?* Nothing to index, and a huge or malicious repo could exhaust the machine.
*Think of it as:* the delivery truck that also refuses oversized parcels and removes hazardous contents before storage.

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

**What are `analysis/*` and `tasks`?**
Reserved packages: `analysis/reader_order`, `analysis/retrieval`, `analysis/plan_checks`, `analysis/packer` and `tasks` each contain only an empty `__init__.py`.
*Why do we need them?* Reader order, evidence retrieval, deterministic plan checks, context packing and background jobs are the next layer above the pipeline.
*What breaks without it?* Those capabilities simply don't exist yet; nothing depends on them today.
*Think of it as:* empty shelves already labelled for the next deliveries.

**What is `pipeline/cache`?**
An empty package reserved for clone/index caching beyond the chunking step's file-hash cache in SQLite.
*Why do we need it?* Re-cloning and re-indexing the same commit is slow and wasteful.
*What breaks without it?* Repeat runs pay the full cost again (only chunking avoids re-parsing unchanged files).
*Think of it as:* a fridge that is still empty.

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
**Files in it:** `backend/app/main.py` (the app factory, CORS, global error handlers, rate-limit handler, and `GET /health` plus the `GET /evals` stub), `backend/app/core/email.py` (SMTP sending with a dev console fallback, and verification/reset email helpers), `backend/app/core/ratelimit.py` (the slowapi `Limiter`), `backend/app/schemas/{__init__,common,auth,repo,stub}.py` (the Pydantic request/response models), `backend/app/security/{__init__,passwords,tokens,email_tokens}.py` (password hashing, JWT, email-token helpers), `backend/app/features/auth/{__init__,dependencies,router}.py` (the complete auth feature), `backend/app/features/repos/{__init__,dependencies,router}.py` (the repo-records feature plus the shared `get_owned_repo` dependency), and the Part 2–4 stub routers `backend/app/features/{indexing,plan,reader,context}/router.py` and `backend/app/agent/router.py`.
**Depends on:** Layers 1–4 (config, DB, models, migrations); the API will also depend on Layers 5–6 once it actually runs the pipeline or the AI.
**Used by:** the frontend and any external client.

*Part 1 is complete on the backend. `main.py` defines the app, `GET /health`, the rate-limit handling and the `GET /evals` stub, `schemas/` defines all Part 1 models plus the documented contract, `security/` implements password hashing, JWT and email-token helpers, `core/email.py` sends mail, `core/ratelimit.py` provides the limiter, `features/auth/` implements every Part 1 auth endpoint, `features/repos/` implements repo CRUD, and the Part 2–4 routers register every remaining endpoint as an ownership-checked `501` stub. The pipeline pieces in Layer 5 work as library/CLI code but no route calls them; the analysis and AI layers above are still empty `__init__.py`.*

#### Study Notes for this layer

**What is `backend/app/main.py`?**
The FastAPI app factory (`create_app()`) plus the module-level `app = create_app()` that uvicorn imports as `app.main:app`.
*Why do we need it?* It builds the ASGI application, attaches CORS, the rate limiter and error handling, registers `GET /health` and `GET /evals`, and mounts the auth, repos and stub routers.
*What breaks without it?* There is no server to run; `uvicorn app.main:app` cannot start.
*Think of it as:* the front door of the building — it now exists and opens.

**Why `create_app()` as a factory instead of a bare `app`?**
It builds and configures a fresh `FastAPI` instance and returns it, with `app = create_app()` at module level for uvicorn.
*Why do we need it?* Settings, middleware and handlers are applied in one obvious place, and tests can build isolated app instances.
*What breaks without it?* Configuration would be scattered at import time with no clean seam to build or test the app.
*Think of it as:* a recipe for assembling the store before opening, rather than a pre-built store you can't rearrange.

**What is the CORS middleware doing here?**
`add_middleware(CORSMiddleware, ...)` with `allow_origins=settings.CORS_ORIGINS` (plus all methods/headers and credentials).
*Why do we need it?* The browser frontend is served from a different origin and needs the API to permit it.
*What breaks without it?* The frontend's requests are blocked by the browser's same-origin policy.
*Think of it as:* a guest list at the door naming exactly which websites may call in.

**What are the global exception handlers?**
Handlers for `RequestValidationError` (422), `StarletteHTTPException` (its status code), `RateLimitExceeded` (429), and `Exception` (500), all returning `{"error": {"code", "message", "details"?}}`.
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
It exposes the auth endpoints on an `APIRouter(prefix="/auth")`. Signup normalizes the email to lowercase, rejects duplicates (409), hashes the password, stores an unverified `User`, creates a `VERIFY` email token and sends the verification link. `verify-email` looks up the token by its hash and rejects invalid/expired/used tokens (400) before marking the user verified and the token used. `resend-verification` always returns the same 200 message (no account enumeration) and only sends when the account exists and is unverified, invalidating older unused verify tokens. `login` checks the password (401 on mismatch) and blocks unverified users (403) before issuing access + refresh tokens. `refresh` accepts only a refresh token (an access token is rejected 401), re-checks that the user still exists and is verified, and returns a new pair. `logout` confirms success but is client-side only (no revocation table). `forgot-password` always returns the same 200 message, and only for an existing user creates a single-use `RESET` token and sends the email in the background. `reset-password` validates a valid/unexpired/unused `RESET` token, applies the password rule, sets the new hash and stamps `used_at`. `change-password` verifies the current password, rejects reusing the old password, and sets the new hash. `delete-account` deletes the user (cascading to tokens and repos). `/auth/me` returns the current user.
*Why do we need it?* It is the concrete account lifecycle the rest of the app is gated behind.
*What breaks without it?* Accounts can't be created, recovered, or managed, so nothing downstream can be owned by a user.
*Think of it as:* the reception desk that checks your ID, issues your badge, hands out reprints, and shreds your file when you leave.

**What is `get_current_user`?**
A FastAPI dependency in `features/auth/dependencies.py` that reads the `Authorization: Bearer <access_token>` header, decodes it as an access token via `decode_token`, loads the `User` by the token's subject, and returns it — raising a 401 `"Not authenticated"` for a missing, malformed, expired, wrong-type token or unknown user.
*Why do we need it?* Protected routes (`/auth/me`, `/auth/logout`, `/auth/change-password`, `/auth/account`, and later repos) need one shared, tested way to turn a header into a user.
*What breaks without it?* Every protected endpoint would re-implement token parsing and could drift or leak different errors.
*Think of it as:* the bouncer who checks your wristband and lets you in as the person it names.

**What is `core/email.py`?**
The email service: `send_email()` sends via SMTP (`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`EMAIL_FROM`), or, when `SMTP_HOST` is unset, logs the message to the console instead of sending (the dev fallback). `verification_link()`/`send_verification_email()` build and send the verification message; `reset_link()`/`send_reset_email()` do the same for password reset (links point at `FRONTEND_URL`).
*Why do we need it?* Signup, resend and forgot-password must deliver links, but local dev has no mail server.
*What breaks without it?* Emails can't be sent, and these flows can't be tested locally without real SMTP credentials.
*Think of it as:* the mailroom — it posts letters when the post office is configured, and otherwise reads them aloud so you can still act.

**What is `core/ratelimit.py`?**
A slowapi `Limiter(key_func=get_remote_address)` that keys limits by client IP. The auth router decorates signup, login, forgot-password and resend-verification with `@limiter.limit(lambda: get_settings().RATE_LIMIT_*)`, and `main.py` attaches the limiter to `app.state.limiter` and registers a `RateLimitExceeded` handler that returns the standard 429 `http_error` `"Too many requests"` envelope. Limits come from `RATE_LIMIT_*` settings and are read per request.
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
Part 2's indexing feature; for now a stub router exposing `POST /repos/{repo_id}/index`, `GET .../index/status`, and `GET .../index/summary`, all `501` after an ownership check. The pipeline that would back them exists in `app/pipeline/` (clone, indexer, graph, chunking, retrieval), but no route calls it.
*Why do we need it?* It reserves the pipeline endpoints the frontend polls.
*What breaks without it?* There is no route to start or watch indexing.
*Think of it as:* a washing-machine button that is installed but not wired to the machine.

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
The Pydantic request/response models for the API: `common.py` (error/message envelopes), `auth.py` (auth requests, `TokenResponse`, `UserOut`, password rule), `repo.py` (`RepoCreate`/`RepoOut`/`RepoListOut`, GitHub URL parsing), `stub.py` (`StubQueryRequest` = `{query, mode}` for the Part 3 stub endpoints), re-exported from `__init__.py`.
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
`RepoOut` is the wire shape of a repo (`id`, `url`, `owner`, `name`, `status`, `created_at`, `from_attributes=True`); `RepoListOut` wraps a list as `{"repos": [...]}`.
*Why do we need it?* It hides `user_id` and lets list and detail responses stay consistent objects.
*What breaks without it?* Internal columns leak and lists have no envelope to grow into.
*Think of it as:* the display card for a repo, and a folder that holds the cards.

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

**What it is:** The React + TypeScript + Vite single-page app: landing page, auth pages, dashboard, repo workspace (3D code-graph canvas + Reader/Plan/Context panel), and a Developer page.
**Why it exists:** Humans need a UI, and the workspace turns the deterministic graph/evidence into something you can explore; it also keeps all client code out of the backend so the API stays headless.
**Files in it:** `frontend/src/main.tsx` (providers + render), `frontend/src/App.tsx` (routes), `frontend/src/index.css` (tokens), `frontend/src/api/*` (`client.ts`, `auth.ts`, `repos.ts`, `galaxy.ts`), `frontend/src/mock/*`, `frontend/src/types/*`, `frontend/src/lib/*`, `frontend/src/context/{AuthContext,ToastContext}.tsx`, `frontend/src/components/*` (shared, `ui/` Radix primitives, `landing/`, `auth/`, `dashboard/`, `workspace/`), and `frontend/src/pages/*`.
**Depends on:** Layer 7 (HTTP API) — every data call goes through `src/api/`.
**Used by:** end users.

*Built and passing `npm run typecheck` / `npm run build`. The three query modes and the workspace graph render from `src/api/galaxy.ts`, which calls the real endpoint first and falls back to `src/mock/*` with a visible "Demo data" badge for the endpoints the backend still returns `501` for.*

*Two current mismatches to know about:* the status names the UI uses (`RepoStatus = 'added' | 'indexing' | 'indexed' | 'error'`, mapped by `mapRepoStatus` to `UiRepoStatus = 'not_indexed' | 'indexing' | 'ready' | 'error'`, labels Not indexed / Indexing / Ready / Error) are not the statuses the backend plan defines (`queued`, `cloning`, `indexing`, `ready`, `failed`), so the chip and timeline will need a mapping when the pipeline starts changing `Repo.status`; and the fallback triggers on any non-`401`/`403` failure, not only on `501`, so a real network or server error currently renders as demo data instead of an error state.

#### Study Notes for this layer

**What is `src/main.tsx`?**
The browser entry: it wraps the app in `MotionConfig reducedMotion="user"`, `BrowserRouter`, `AuthProvider`, `ToastProvider` and `TooltipProvider`, then renders `App` into `#root`.
*Why do we need it?* Every route needs the auth/toast/tooltip context and a single place to honour the user's reduced-motion preference.
*What breaks without it?* No React tree mounts; auth state, toasts and tooltips would be unavailable everywhere.
*Think of it as:* the power switch and fuse box for the whole UI.

**What is `src/App.tsx`?**
The route table: `/` (Landing) and `/verify-email` are public, `/login` + `/signup` sit behind `GuestRoute`, and `/dashboard`, `/repo/:id`, `/developer` sit behind `ProtectedRoute` inside `AppLayout`; `*` is the 404 page.
*Why do we need it?* It keeps "who can see what" in one place and reuses the navbar shell for signed-in pages.
*What breaks without it?* The app has no navigation, and protected pages wouldn't require a session.
*Think of it as:* the building directory plus the badge-check at each floor.

**What is `src/api/client.ts`?**
The thin `fetch` wrapper: prefixes `VITE_API_URL`, JSON-encodes bodies, attaches the bearer access token, does one refresh-and-retry on a `401`, parses the backend `{"error": {...}}` envelope into an `ApiError`, and records each call for the Developer page's activity log.
*Why do we need it?* Every request needs the same base URL, auth header, refresh and error handling instead of repeating it per call.
*What breaks without it?* Tokens aren't attached or refreshed, and each caller parses errors differently.
*Think of it as:* the single reception line every request goes through before reaching the API.

**What is `src/api/galaxy.ts`?**
The mock-fallback boundary: for the endpoints the backend returns `501` for (`index`, `index/status`, `index/summary`, `plan`, `reader`, `context`, `query`, `agent/trace`, `evals`) it calls the real route first and, on failure that is not a `401`/`403`, returns typed mock data with `demo: true`; auth errors are rethrown. The catch is broad, so non-`401`/`403` failures of any kind (network, `500`) also become demo data. `getGraph` is always demo (no graph route exists yet).
*Why do we need it?* The whole workspace can be built and demoed now, while still using the real API the moment those routes are implemented.
*What breaks without it?* The workspace would show errors everywhere until Parts 2–4 land.
*Think of it as:* a placeholder actor who steps in only when the lead hasn't arrived, with a sign saying so.

**What is `src/api/auth.ts` / `src/api/repos.ts`?**
Typed wrappers over the real endpoints: `signup`, `login`, `verifyEmail`, `resendVerification`, `getMe`; and `listRepos`, `createRepo`, `getRepo`, `deleteRepo` (plus `mapRepoStatus`/`REPO_STATUS_LABEL` for the status chip).
*Why do we need it?* Screens call small typed functions instead of hand-building requests and mapping wire shapes.
*What breaks without it?* Components would know about URLs and raw JSON shapes.
*Think of it as:* the front desk's list of "the exact forms to fill in" for each service.

**What is `src/types/`?**
Shared TypeScript types mirroring the backend (`auth`, `repo`, `api`) plus UI-only types (`graph`, `query`, `pipeline`), including `UiRepoStatus` and the `INDEX_STAGES` list.
*Why do we need it?* One typed contract keeps the UI honest about what the API returns.
*What breaks without it?* Shapes drift and mistakes only show up at runtime.
*Think of it as:* the agreed blueprint both sides build to.

**What is `src/lib/graphLayout.ts`?**
A deterministic layout shared by the 2D and 3D views: clusters sit on a ring, nodes spiral inside their cluster (no randomness), capped at 1500 nodes, plus `buildAdjacency` and `positionsForIds` helpers.
*Why do we need it?* Both graph views must agree on where nodes are, and the layout must be stable across renders.
*What breaks without it?* Nodes would jump around and the 2D/3D toggle couldn't share a picture.
*Think of it as:* an usher who seats every guest in the same seat every time.

**What is the repo workspace (`src/components/workspace/*`)?**
The core screen: `GraphView` picks 3D (`Graph3D`, lazy-loaded WebGL "galaxy") / 2D (`Graph2D`) / List (`GraphList`, Mermaid + module list); `ModeTabs` + `ModePanel` switch Reader (`ReaderPanel`), Plan (`PlanPanel`) and Context (`ContextPanel`); `CommandBar` is the ⌘K ask box; `StageTimeline` shows clone→parse→graph→index; `CodeBlock` renders shiki-highlighted snippets (lazily imported); `CanvasErrorBoundary` falls back to the 2D graph if WebGL fails.
*Why do we need it?* It is where evidence becomes explorable: highlight nodes, follow the reading order, see plan status colors and the packed-context tiers.
*What breaks without it?* The product has data but no way to actually look at it.
*Think of it as:* the control room where you watch and query the codebase.

**What is the Developer page (`src/pages/Developer.tsx`)?**
A page listing every backend endpoint (method, path, Live vs Demo) and a live **API activity** inspector fed by `src/lib/apiLog.ts` (the same log `client.ts` writes to), with a clear button.
*Why do we need it?* It makes which routes are real vs `501` and what the app is actually calling obvious during development.
*What breaks without it?* Debugging "is this live or mock?" means digging through the network tab.
*Think of it as:* a wall of status lights for every door into the API.

---

### Layer 9: Supporting Tooling (Docker, Evals, Scripts)

**What it is:** Local orchestration, evaluation harness, and helper scripts.
**Why it exists:** These support the runtime without being part of the runtime dependency chain.
**Files in it:** `docker/docker-compose.yml` (empty), `evals/` (folders for agent, context_packer, data, plan_verifier — all `.gitkeep` only), `scripts/.gitkeep`.
**Depends on:** the layers it wraps/tests (any).
**Used by:** developers and CI.

*Not implemented yet. `docker/docker-compose.yml` is empty and there is no Dockerfile. `evals/` and `scripts/` hold only `.gitkeep` files.*

#### Study Notes for this layer

**What is `docker/docker-compose.yml`?**
A placeholder for running the stack via Docker Compose.
*Why do we need it?* Consistent local/dev environments.
*What breaks without it?* You run everything manually.
*Think of it as:* a shipping container that packages the whole app.

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

Three things run end to end right now: applying the database schema, serving the HTTP API, and the pipeline CLIs (index → graph → chunk → retrieve) over a local folder. The HTTP API still connects to none of the pipeline. First, here is exactly what happens when you run `alembic upgrade head` from `backend/` with the venv active:

1. **Entry (Layer 4).** The `alembic` CLI reads `backend/alembic.ini`, sees `script_location = %(here)s/alembic`, and loads `backend/alembic/env.py`.
2. **Wiring (Layer 4 -> 1/2/3).** `env.py` inserts `backend/` into `sys.path`, then imports `get_settings` (Layer 1), `Base` (Layer 2) and `app.models` (Layer 3). Importing `app.models` runs `models/__init__.py`, which imports `User`, `EmailToken`, `EmailTokenType`, and `Repo`, registering all three tables on `Base.metadata`.
3. **Config (Layer 1).** `get_settings()` reads `backend/.env`, validates it into a cached `Settings`, and returns `DATABASE_URL = "sqlite:///./repotrackr.db"`.
4. **URL + metadata (Layer 4).** `env.py` calls `config.set_main_option("sqlalchemy.url", ...)` with that URL and sets `target_metadata = Base.metadata`.
5. **Engine (Layer 4 -> 2).** `run_migrations_online()` builds an engine via `engine_from_config` and connects.
6. **Migrations (Layer 4).** Alembic compares `alembic_version` against the revision chain and runs, in order, `9dbee76d77e4_create_users_email_tokens_repos.py` (issues `CREATE TABLE` for `users`, `email_tokens`, and `repos`, plus indexes, foreign keys, the `email_token_type` enum, `uq_user_repo_url`, and defaults) and then `09282e667a32_add_commit_sha_to_repos.py` (batch-adds the nullable `repos.commit_sha` column).
7. **Output.** `backend/repotrackr.db` now exists with those tables (and `alembic_version`). `alembic check` then reports "No new upgrade operations detected" because the models match the migration.

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
                         ▼
              backend/repotrackr.db  (3 tables + alembic_version)
```

### HTTP request flow (app factory)

When uvicorn imports `app.main:app`, the module builds the app, mounts the auth and repos routers, and serves requests:

1. **Startup (Layer 7).** `uvicorn app.main:app` imports `backend/app/main.py`, which calls `create_app()` and assigns `app = create_app()`.
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
4. **Refresh (Layer 7).** `POST /auth/refresh` decodes the submitted token as a refresh token (an access token fails), confirms the user still exists and is verified, and returns a fresh pair.
5. **Me / protected routes (Layer 7).** `GET /auth/me` (and `logout`, `change-password`, `DELETE /account`) depend on `features/auth/dependencies.get_current_user`, which decodes the Bearer access token and loads the user.
6. **Forgot / reset (Layer 7).** `POST /auth/forgot-password` always returns the same 200 message; for an existing user it creates a single-use `RESET` token and schedules `core/email.send_reset_email` as a background task. `POST /auth/reset-password` validates the token (valid/unexpired/unused/type reset), applies the password rule, sets the new hash and stamps `used_at`.

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

### Stub request flow (Parts 2–4)

Every Part 2–4 endpoint is registered but not implemented, so the frontend can wire it now and get realistic behavior:

1. **Repo-scoped stubs (Layer 7).** `POST /repos/{repo_id}/index`, `GET .../index/status`, `GET .../index/summary`, `POST`/`GET /repos/{repo_id}/plan`, `GET /repos/{repo_id}/reader`, `POST /repos/{repo_id}/context`, `POST /repos/{repo_id}/query`, and `GET /repos/{repo_id}/agent/trace` each depend on `features/repos/dependencies.get_owned_repo` (so a missing token is 401 and a foreign/missing repo is the same 404) and then return `501 {"status": "not_implemented"}`.
2. **Evals stub (Layer 7).** `GET /evals` is public (no auth, no repo) and also returns `501 {"status": "not_implemented"}`.

```
Browser ──POST /repos/{id}/index (Bearer)──► app/main.py:app ──► features/indexing/router.py
                                │ get_owned_repo: 401 / 404 / else
                                ▼
                     501 {"status": "not_implemented"}
```

### Pipeline flow (local folder -> index -> graph -> chunks -> BM25)

The deterministic pipeline runs from the shell, one command per step, over a folder on disk (today a clone made by `safe_clone`, or any local Python project). Nothing here touches the HTTP API, the request DB, or a model:

1. **Clone (Layer 5).** `safe_clone(url, CloneConfig(root=...))` checks the remote size against `CLONE_MAX_SIZE_MB`, shallow-clones under a timeout, records the HEAD commit SHA, and `clean_repo` deletes skipped directories and secret files. It is a library call only — no endpoint and no CLI call it.
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
stdout only — no HTTP route, no Repo row update, no AI call
```

The results exist only on stdout. Nothing sets `Repo.status` or `Repo.commit_sha`, because no HTTP route or background task calls the pipeline yet.

### Frontend flow (browser -> API -> back)

The React app in `frontend/` talks to Layer 7 through `src/api/`:

1. **Boot (main.tsx).** `main.tsx` mounts the providers and `App.tsx` picks a route. `ProtectedRoute`/`GuestRoute` (`src/components/guards.tsx`) redirect based on the session held in `AuthContext` (tokens in `localStorage` via `src/lib/tokenStorage.ts`).
2. **Auth.** Signup/login/verify call `src/api/auth.ts` -> `src/api/client.ts` -> the real `/auth/*` routes; a successful login stores the token pair in `AuthContext` and `/auth/me` restores the session on reload.
3. **Dashboard.** `Dashboard` calls `listRepos()` (real `GET /repos`) and renders `RepoCard`s; the track modal calls `createRepo()` (real `POST /repos`). "Index" calls `startIndex()` in `src/api/galaxy.ts`.
4. **Workspace.** `/repo/:id` loads the repo (`getRepo`, real) and the graph (`getGraph`, always demo), starts polling `getIndexStatus()` for the timeline, and lays out nodes with `src/lib/graphLayout.ts`. `GraphView` renders the lazy `Graph3D` (three.js/WebGL) with 2D `Graph2D` and Mermaid `GraphList` fallbacks.
5. **Query modes.** The ⌘K `CommandBar` and tab switches call `queryRepo()`/`getReader()`/`getPlan()`/`buildContext()` from `src/api/galaxy.ts`: each tries the real route and, on `501`, returns typed mock data flagged `demo: true`, so the panel shows a "Demo data" badge. Reader highlights the reading order and cites `file:line`; Plan colors nodes by check status; Context highlights the packed tiers and shows the token budget.
6. **Activity.** Every call through `client.ts` is appended to the in-memory log in `src/lib/apiLog.ts`, which the Developer page displays live.

```
Browser (frontend/)
  Page/component ──► src/api/*.ts ──► src/api/client.ts ──► VITE_API_URL (Layer 7)
                                              │  Bearer token, 401 refresh-retry, error envelope
                                              ▼
                     real route  ──► 200  (rendered directly)
                     real route  ──► 501  ──► src/api/galaxy.ts falls back to src/mock/
                                              ▼
                                  rendered with a "Demo data" badge
```

## Current Status

Working now (verified by the current 202-test suite; see `docs/changes.md` for step history):
- Settings & Configuration (`app/core/config.py`, `backend/.env`, `backend/.env.example`).
- Database Core (`app/core/database.py`).
- Data Models (`app/models/user.py`, `email_token.py`, `repo.py`, `__init__.py`).
- Schema Migrations — `alembic.ini`, `alembic/env.py`, and two migrations creating `users`, `email_tokens`, `repos` and then adding `repos.commit_sha`.
- HTTP API app factory (`app/main.py`): `create_app()`, CORS from `CORS_ORIGINS`, the slowapi limiter + 429 handler, global JSON error handlers, `GET /health`, and the `GET /evals` stub; runnable via `uvicorn app.main:app`.
- Auth feature (`app/features/auth/router.py`, `app/features/auth/dependencies.py`): `POST /auth/signup`, `POST /auth/verify-email`, `POST /auth/resend-verification`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/change-password`, `DELETE /auth/account`, and `GET /auth/me`, mounted in `main.py`.
- Rate limiting (`app/core/ratelimit.py`, slowapi): per-IP limits on signup, login, forgot-password and resend-verification, configurable via `RATE_LIMIT_*`, returning 429 `http_error`.
- Repo-records feature (`app/features/repos/router.py`, `dependencies.py`): `POST /repos`, `GET /repos`, `GET /repos/{repo_id}`, and `DELETE /repos/{repo_id}`, all auth-required and scoped to the current user; new repos get `status="added"`, duplicates per user (case-insensitive) return 409, and another user's or a missing repo returns the same 404.
- Part 2–4 stubs (`app/features/{indexing,plan,reader,context}/router.py`, `app/agent/router.py`, `GET /evals`): all 10 documented not-yet-implemented endpoints are registered. Repo-scoped ones verify ownership via `get_owned_repo` (401 / 404) and then return `501 {"status": "not_implemented"}`; `/evals` is public.
- Safe clone (`app/pipeline/clone/`): `safe_clone` checks the remote size, shallow-clones under a timeout, records the commit SHA and returns a `CloneResult`; `clean_repo` deletes skipped directories and secret files; `CloneError` carries typed codes. Covered by 29 tests; not called by any endpoint.
- AST indexer (`app/pipeline/indexer/`): `parse_source`/`parse_file` use `ast` (never import or execute the code) to record symbols with exact `line_start`/`line_end`, signatures, docstrings and parents, plus imports and calls; `index_repo` walks a folder with ignore rules; `detect.py` finds test files and entry points. CLI: `python -m app.pipeline.indexer <folder>`. Covered by 24 tests.
- Code graph (`app/pipeline/graph/`): `build_graph` produces module and symbol nodes with import and call edges, per-module `CentralityScore` (in-degree + PageRank), a breadth-first `reading_order` from entry points, and a Mermaid diagram. CLI: `python -m app.pipeline.graph <folder>`. Covered by 16 tests.
- Chunking + SQLite cache (`app/pipeline/chunking/`): one `Chunk` per symbol with a tiktoken `cl100k_base` token count and a `too_large` flag above 2000 tokens; `ChunkStore` keeps `chunks` (keyed by commit SHA + chunk id) and `file_cache` (keyed by file + sha256) in `backend/data/chunks.db`, so unchanged files are not re-parsed. CLI: `python -m app.pipeline.chunking <folder> [--sha SHA] [--db PATH]`. Covered by 11 tests.
- BM25 retrieval (`app/pipeline/retrieval/`): `BM25Index`/`load_index` rank one commit's stored chunks with `rank_bm25`, using a shared tokenizer that splits identifiers, and return `SearchResult`s with `file:line` and scores. CLI: `python -m app.pipeline.retrieval "<query>" [--k N] [--sha SHA] [--db PATH]`; batch runner: `python -m app.pipeline.retrieval.queries <file>`. Covered by 19 tests.
- Retrieval baseline data: `backend/data/queries.txt` (10 queries: 5 exact names, 5 plain-word ideas) and `backend/data/bm25_failure_notes.md` (per-query correct answer, top 3, hit/miss, reason). Measured result: 7/10 hits at top-3; exact names 5/5 (ranks 2, 3, 3, 1, 1), plain words 2/5; three documented failure patterns (vocabulary mismatch, generic-word/short-chunk bias, usage chunks outranking definitions). Both files live under the gitignored `backend/data/`.
- Email service (`app/core/email.py`): SMTP sending via `SMTP_*`/`EMAIL_FROM` with a console fallback when `SMTP_HOST` is unset, plus verification/reset link and email helpers.
- Request/response schemas (`app/schemas/{common,auth,repo,stub}.py`) and the documented contract (`docs/api_contract.md`, `docs/mock_responses.md`, `docs/openapi.json`, `docs/postman_collection.json`).
- Security helpers (`app/security/{passwords,tokens,email_tokens}.py`): argon2 password hashing, JWT access/refresh with type-checked `decode_token`, and verify/reset email-token helpers.
- `README.md`: project overview, tech stack, setup from scratch, run/test commands, folder map and docs links.
- Tests (`backend/tests/`): **202 passing** (`python -m pytest -q`) — `test_security.py` 18, `test_auth.py` 37, `test_repos.py` 19, `test_stubs.py` 29, and under `tests/pipeline/`: `test_clone.py` 29, `test_indexer.py` 24, `test_graph.py` 16, `test_chunking.py` 11, `test_retrieval.py` 19.
- Frontend (Layer 8, `frontend/`): landing page, signup/login/verify-email, dashboard (track-repo modal + repo cards), repo workspace (3D/2D/List graph, Reader/Plan/Context modes, ⌘K command bar, indexing timeline), and the Developer page (endpoint catalog + live API activity). `npm run typecheck` and `npm run build` pass; lint is warning-only. It calls the live `/auth` and `/repos` routes and shows a "Demo data" badge for the `501` endpoints.

Not built yet (current absences, not a plan):
- API wiring for the pipeline: no route runs `safe_clone`, the indexer, graph, chunking or retrieval. `POST /repos/{repo_id}/index` (the scan trigger), `GET .../index/status` and `GET .../index/summary` are `501` stubs; there is no tree/graph route and no search route (`POST .../query` is a `501` stub).
- Pipeline cache (`app/pipeline/cache`), every analysis pass (`app/analysis/{reader_order,retrieval,plan_checks,packer}`) and background jobs (`app/tasks`) — empty `__init__.py` only.
- AI layer (`app/ai/{embeddings,prompts,router}`) and the agent loop (`app/agent` holds only the `501` trace router): no embeddings, no LLM provider (Gemini included) and no API-key setting.
- Eval set and harnesses (`evals/*` — `.gitkeep` only), Docker orchestration (`docker/docker-compose.yml` empty, no Dockerfile) and helper scripts (`scripts/` — `.gitkeep` only).
- Nothing advances `Repo.status` or stores `Repo.commit_sha`: repo rows stay at `status="added"`.

Known open issues (current state, to fix before or while wiring the API):
- `safe_clone` is not wired to any endpoint yet.
- Clone URL allow-list: **fixed**. `safe_clone` (`backend/app/pipeline/clone/clone.py`) accepts public GitHub HTTPS URLs only (`https://github.com/<owner>/<repo>`, `.git` optional) and rejects every other scheme, host, credential, port, query string, fragment, leading `-` or whitespace-bearing URL with `CloneError("invalid_url")`. Local `file://` clones exist only in the test-only helper in `backend/tests/pipeline/test_clone.py`.
- Frontend status names differ from the backend plan: the UI's wire status is `added`/`indexing`/`indexed`/`error` (mapped to `not_indexed`/`indexing`/`ready`/`error`), while the plan uses `queued`/`cloning`/`indexing`/`ready`/`failed`.
- The frontend falls back to typed mock data with `demo: true` on any non-`401`/`403` failure, so real network or `500` errors render as "Demo data".
- `frontend-redesign` has two commits that are not merged into `phase1`: `0df4d61 feat : done cloning process` and `f041b99 feat : Delete the repo content after final block` (clone cleanup work).

Part 1 status: **backend-complete and front-complete for the pages the backend supports.** Auth, repos, all Part 2–4 stubs, the error contract, tests, README, and the OpenAPI/Postman docs exist and pass, and the frontend pages (including the repo workspace that opens from a dashboard repo card) are built. The deterministic pipeline now exists as tested library/CLI code (safe clone, AST indexer, networkx graph, chunking, BM25) but is not connected to the API, to the `Repo` rows, or to the frontend. The workspace's graph, reader, plan and context views use clearly-badged "Demo data" until the Part 2–4 endpoints stop returning `501`. Note: to use the frontend against a local backend, add `http://localhost:5173` to `backend/.env`'s `CORS_ORIGINS` (the template defaults to port 3000).

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

Environment variables:
- Copy the template and edit it: `cp .env.example .env`
- Required: `SECRET_KEY` (no default). Generate one with:
  `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- Others (all have defaults): `APP_NAME`, `ENV`, `DATABASE_URL`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `VERIFY_TOKEN_EXPIRE_HOURS`, `RESET_TOKEN_EXPIRE_MINUTES`, `RATE_LIMIT_LOGIN`, `RATE_LIMIT_SIGNUP`, `RATE_LIMIT_FORGOT_PASSWORD`, `RATE_LIMIT_RESEND_VERIFICATION`, `FRONTEND_URL`, `CORS_ORIGINS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `CLONE_ROOT` (`data/clones`), `CLONE_MAX_SIZE_MB` (200), `CLONE_TIMEOUT_SECONDS` (120).

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
Swagger UI is at `http://127.0.0.1:8000/docs` (endpoints grouped by tag: `system`, `auth`, `repos`, `stubs`) and the raw spec at `/openapi.json` (also exported to `docs/openapi.json`). `GET /health` answers as long as the app imports. The full auth surface is live under `/auth` (`signup`, `verify-email`, `resend-verification`, `login`, `refresh`, `logout`, `forgot-password`, `reset-password`, `change-password`, `account`, `me` — see `docs/api_contract.md`), and repo CRUD is live under `/repos` (`POST`, `GET`, `GET /{id}`, `DELETE /{id}`, all requiring a Bearer token). The Part 2–4 routes (indexing, plan, reader, context, query, agent/trace, evals) are registered but return `501 {"status": "not_implemented"}`; repo-scoped ones still enforce the same 401/404 rules. To see verification/reset links locally, leave `SMTP_HOST` empty in `.env`: the messages are logged to the server console with their `http://localhost:3000/...?token=...` links.

Run the tests (from `backend/`, venv active):
```bash
python -m pytest tests/ -q                  # 202 passing (auth/repos/stubs + pipeline)
python -m pytest tests/test_security.py -q  # 18
python -m pytest tests/test_auth.py -q      # 37
python -m pytest tests/test_repos.py -q     # 19
python -m pytest tests/test_stubs.py -q     # 29
python -m pytest tests/pipeline/ -q         # 99 (clone 29, indexer 24, graph 16, chunking 11, retrieval 19)
```

Run the deterministic pipeline (from `backend/`, venv active; output to stdout only):
```bash
python -m app.pipeline.indexer ../some-folder          # kind | name | file:line + summary
python -m app.pipeline.graph ../some-folder            # central modules, reading order, Mermaid
python -m app.pipeline.chunking ../some-folder --sha <commit-sha>
python -m app.pipeline.retrieval "parse_github_url" -k 5
python -m app.pipeline.retrieval.queries data/queries.txt
```
The chunk store defaults to `backend/data/chunks.db` (gitignored; `--db` overrides it). Retrieval's `--sha` defaults to the commit with the most stored chunks. `safe_clone` has no CLI: it is a library call that takes a `CloneConfig(root=..., max_size_mb=..., timeout_seconds=...)`, and no endpoint invokes it. None of these commands updates the `repos` table or the API.

Run the frontend (from `frontend/`, Node 20+):
```bash
npm install
cp .env.example .env        # optional; VITE_API_URL defaults to http://localhost:8000
npm run dev                 # Vite dev server on http://localhost:5173
npm run typecheck           # tsc -b --noEmit
npm run build               # production build (3D canvas + Mermaid are code-split)
npm run lint                # oxlint
```
Start the backend first (from `backend/`, venv active) with `uvicorn app.main:app --reload`. The Vite dev server runs on port **5173**, so add `http://localhost:5173` (and `http://127.0.0.1:5173`) to `CORS_ORIGINS` in `backend/.env` or the browser will block the API calls. The workspace's graph, reader, plan and context views show a "Demo data" badge until the Part 2–4 endpoints stop returning `501`.

## Where You Can Help

- **Layer 8, `frontend/`:** the client is built; when a Part 2–4 endpoint stops returning `501`, remove its entry from the mock fallback in `src/api/galaxy.ts` (and its "Demo data" badge will disappear automatically) or replace the `501` handling with the real shape.
- **Layer 7, `app/main.py`:** the app factory exists and now includes all routers (auth, repos, and the Part 2–4 stubs) — replace stub routers with real ones and extend middleware as features are built.
- **Layer 7, `app/security/`:** helpers exist and are tested — extend them (e.g. token rehash checks) as auth needs grow.
- **Layer 7, `app/schemas/`:** schemas for Part 1 exist (plus `stub.py`) — extend them (and `docs/api_contract.md`/`docs/mock_responses.md`/`docs/openapi.json`/`docs/postman_collection.json`) when endpoints change.
- **Layer 7, `app/features/auth/`:** the full Part 1 auth surface (signup/verify/resend/login/refresh/logout/forgot/reset/change/delete/me) plus rate limiting is built; `get_current_user` is reused by the repos feature and every repo-scoped stub.
- **Layer 7, `app/core/ratelimit.py`:** limits exist for the abuse-prone auth endpoints — add them to other sensitive endpoints and consider a shared storage (Redis) for multi-process deploys.
- **Layer 7, `app/features/repos/`:** repo CRUD plus `get_owned_repo` are built; Part 2 flips `status` through the pipeline instead of leaving it at `"added"`.
- **Layer 7, stub routers:** `app/features/{indexing,plan,reader,context}/router.py` and `app/agent/router.py` return `501`; implement them in Parts 2–4 (they already enforce ownership).
- **Layer 2/3:** register a second model change by adding a model then running `alembic revision --autogenerate`; test `render_as_batch` behavior on SQLite.
- **Layer 5, `app/pipeline/`:** clone, indexer, graph, chunking and retrieval exist as tested library + CLI code. What is missing is the HTTP wiring (endpoints, status tracking, `Repo.commit_sha`) and the `pipeline/cache` package; also narrow the clone URL allow-list before exposing cloning.
- **Layer 5, `app/analysis/retrieval`:** make sure every future AI claim can attach a real `file:line`, per the design rule.
- **Layer 9:** fill `docker/docker-compose.yml` and add a Dockerfile; stand up the `evals/` harnesses.
- **Tests:** `test_security.py`, `test_auth.py`, `test_repos.py`, `test_stubs.py` and `tests/pipeline/*` exist (202 passing) — extend them (e.g. `Settings` validation, `get_db()` lifecycle, migration up/down, real pipeline endpoints).

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
