# Project Summary

## What This Project Is
RepoTrackr AI is a backend-first tool for ingesting GitHub repositories and reasoning about them: it clones a repo, builds a deterministic index and static analysis of the code, and only then lets an AI layer explain things on top of that evidence. Right now the foundation exists — settings, the database engine, the SQLAlchemy models, the first Alembic migration, and a minimal FastAPI app that serves `GET /health` with CORS and consistent JSON error handling. The pipeline, analysis, AI, feature routers, frontend, Docker and evals folders are all scaffolded but empty.

## Project Structure
```
RepoTrackr-AI/
├── .gitignore                       # Ignores Python/venv/secrets/DB/frontend junk
├── AGENTS.md                        # Working rules for contributors/agents
├── README.md                        # Empty; not written yet
├── project_summary.md               # Legacy copy; canonical doc is docs/project_summary.md
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
│   │       └── 9dbee76d77e4_create_users_email_tokens_repos.py  # First migration
│   ├── app/
│   │   ├── __init__.py              # Empty package marker
│   │   ├── main.py                  # FastAPI app factory: create_app(), CORS, error handlers, GET /health
│   │   ├── core/
│   │   │   ├── __init__.py          # Empty package marker
│   │   │   ├── config.py            # Settings class + cached get_settings()
│   │   │   └── database.py          # Engine, Base, SessionLocal, get_db()
│   │   ├── models/
│   │   │   ├── __init__.py          # Re-exports User, EmailToken, Repo
│   │   │   ├── user.py              # User table + relationships
│   │   │   ├── email_token.py       # EmailToken table + EmailTokenType enum
│   │   │   └── repo.py              # Repo table
│   │   ├── schemas/
│   │   │   ├── __init__.py          # Re-exports all schemas
│   │   │   ├── common.py            # ErrorDetail, ErrorResponse, MessageResponse
│   │   │   ├── auth.py              # Auth request/response schemas + password rule
│   │   │   └── repo.py              # RepoCreate/RepoOut/RepoListOut + GitHub URL parse
│   │   ├── security/__init__.py     # Empty — password/JWT helpers
│   │   ├── features/
│   │   │   ├── __init__.py          # Empty package marker
│   │   │   ├── auth/__init__.py     # Empty — signup/login/verify endpoints
│   │   │   ├── repos/__init__.py    # Empty — add/list repo endpoints
│   │   │   ├── plan/__init__.py     # Empty — plan feature
│   │   │   ├── indexing/__init__.py # Empty — indexing trigger/status
│   │   │   ├── context/__init__.py  # Empty — context packing feature
│   │   │   └── reader/__init__.py   # Empty — reader feature
│   │   ├── pipeline/
│   │   │   ├── __init__.py          # Empty package marker
│   │   │   ├── clone/__init__.py    # Empty — clone repos
│   │   │   ├── chunking/__init__.py # Empty — split code into chunks
│   │   │   ├── indexer/__init__.py  # Empty — build deterministic index
│   │   │   ├── cache/__init__.py    # Empty — clone/index cache
│   │   │   └── graph/__init__.py    # Empty — code graph
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
│   │   ├── agent/__init__.py        # Empty — AI agent/tool loop
│   │   └── tasks/__init__.py        # Empty — background jobs
│   └── tests/__init__.py            # Empty test package
├── docker/
│   └── docker-compose.yml           # Empty; no Dockerfile yet
├── docs/
│   ├── RepoTrackr-AI-Execution-Plan.md  # Source-of-truth roadmap (Parts 1-4)
│   ├── project_summary.md           # This file (canonical)
│   ├── api_contract.md              # Endpoint contract for Parts 1-4
│   ├── mock_responses.md            # Example JSON for frontend mocks
│   └── changes.md                   # Step-by-step change log (all history)
├── evals/
│   ├── .gitkeep
│   ├── agent/.gitkeep               # Empty — agent evals
│   ├── context_packer/.gitkeep      # Empty — packer evals
│   ├── data/.gitkeep                # Empty — eval data
│   └── plan_verifier/.gitkeep       # Empty — plan verification evals
├── frontend/
│   └── .gitkeep                     # Empty — no frontend code yet
└── scripts/
    └── .gitkeep                     # Empty — helper scripts
```

## The Stack at a Glance
Settings -> Database Core -> Data Models -> Schema Migrations (Alembic) -> Pipeline & Analysis -> AI Layer -> Features & HTTP API -> Frontend, with Docker/Evals/Scripts as supporting tooling.

(Layers 1–4 are fully built. Layer 7 has its app factory, `GET /health`, and the Pydantic schemas plus the endpoint/mock contract. The feature routers, `security` helpers and everything above are an empty folder skeleton.)

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
A model for a tracked repository: `user_id`, `url`, `owner`, `name`, `status` (default `"added"`), `created_at`, with a `UniqueConstraint("user_id", "url")`.
*Why do we need it?* It records which repositories a user added so the pipeline can process them.
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
**Files in it:** `backend/alembic.ini` (config, no hardcoded URL), `backend/alembic/env.py` (wires settings + `Base` + models), `backend/alembic/versions/9dbee76d77e4_create_users_email_tokens_repos.py` (first migration), `backend/alembic/script.py.mako` (template for new migrations), `backend/alembic/README`.
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

**Why does `downgrade()` drop tables in reverse order?**
It drops `repos`, then `email_tokens`, then `users` (and their indexes).
*Why do we need it?* Foreign keys mean children must go before parents.
*What breaks without it?* Downgrading would fail on constraint violations and leave the DB half-migrated.
*Think of it as:* taking down scaffolding from the top, never pulling the bottom beam first.

---

### Layer 5: Repository Pipeline & Deterministic Analysis

**What it is:** The folder skeleton reserved for the deterministic half of the product — cloning repos, chunking, indexing, caching, building a code graph, and the analysis passes (reader order, retrieval, plan checks, context packing).
**Why it exists:** The design rule is that deterministic analysis decides what is true; the AI only reasons over this evidence. Keeping it separate from `ai/` enforces that.
**Files in it:** `backend/app/pipeline/{clone,chunking,indexer,cache,graph}/__init__.py`, `backend/app/analysis/{reader_order,retrieval,plan_checks,packer}/__init__.py`, and `backend/app/tasks/__init__.py`.
**Depends on:** Layer 1 (settings), Layer 2 (sessions), Layer 3 (models, e.g. `Repo`).
**Used by:** the future AI Layer (as evidence) and the future HTTP API (to trigger and report status).

*Not implemented yet. Every file listed is an empty `__init__.py` package marker.*

#### Study Notes for this layer

**What is `pipeline/clone`?**
Reserved for cloning a repo's code to local disk.
*Why do we need it?* Everything downstream needs a local copy to read.
*What breaks without it?* Nothing to index or analyze.
*Think of it as:* the delivery truck bringing the package to the warehouse.

**What is `pipeline/chunking`?**
Reserved for splitting source files into analyzable chunks.
*Why do we need it?* You can't embed or search whole repos at once.
*What breaks without it?* Downstream code has no unit of content to index.
*Think of it as:* cutting a long document into index cards.

**What is `pipeline/indexer`?**
Reserved for building the searchable index over the cloned code.
*Why do we need it?* Retrieval needs a persistent index to look things up fast.
*What breaks without it?* Every query would have to re-read raw files.
*Think of it as:* the back-of-the-book index so you don't re-read every page.

**What is `pipeline/cache`?**
Reserved for caching clones and index artifacts.
*Why do we need it?* Re-cloning and re-indexing the same repo is slow and wasteful.
*What breaks without it?* Repeat runs are needlessly expensive.
*Think of it as:* keeping leftovers in the fridge instead of cooking from scratch each time.

**What is `pipeline/graph`?**
Reserved for building a graph of code structure/dependencies.
*Why do we need it?* Understanding how files and symbols relate needs a graph, not a flat list.
*What breaks without it?* Analysis loses the connections between code pieces.
*Think of it as:* a subway map instead of a list of station names.

**What is `analysis/reader_order`?**
Reserved for deciding which files a reader should look at first.
*Why do we need it?* A newcomer needs a sensible reading path through a codebase.
*What breaks without it?* Output would be an unsorted pile of files.
*Think of it as:* a table of contents ordered by importance.

**What is `analysis/retrieval`?**
Reserved for pulling the exact evidence (with file:line) for a question.
*Why do we need it?* The design rule says every claim must cite real code.
*What breaks without it?* The AI would have nothing grounded to reason over.
*Think of it as:* a court clerk fetching the exact documents a lawyer asked for.

**What is `analysis/plan_checks`?**
Reserved for deterministic checks against a plan.
*Why do we need it?* Some truths are checkable without any AI.
*What breaks without it?* Plan verification would rely entirely on the model.
*Think of it as:* a spell-checker that catches obvious errors before an editor reads it.

**What is `analysis/packer`?**
Reserved for packing selected evidence into a bounded context for the AI.
*Why do we need it?* Models have token limits; you must choose what fits.
*What breaks without it?* You'd overflow the prompt or send irrelevant code.
*Think of it as:* packing only the essentials into a carry-on bag.

**What is `tasks`?**
Reserved for background jobs (e.g. running the pipeline out-of-band).
*Why do we need it?* Cloning/indexing is slow and shouldn't block HTTP requests.
*What breaks without it?* Long operations would tie up the request cycle.
*Think of it as:* the kitchen queue ticket, separate from the waiter taking orders.

---

### Layer 6: AI Layer

**What it is:** The folder skeleton reserved for the LLM side — embeddings, prompt templates, model routing, and the agent/tool loop.
**Why it exists:** The design rule says the AI only retrieves, reasons over evidence, and explains; keeping it isolated makes that boundary explicit and lets the rest of the app work when the AI is unavailable.
**Files in it:** `backend/app/ai/embeddings/__init__.py`, `backend/app/ai/prompts/__init__.py`, `backend/app/ai/router/__init__.py`, `backend/app/agent/__init__.py`.
**Depends on:** Layer 5 (deterministic evidence) — by design it must not invent facts on its own.
**Used by:** the future HTTP API.

*Not implemented yet. Every file listed is an empty `__init__.py` package marker.*

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
**Files in it:** `backend/app/main.py` (the app factory, CORS, global error handlers, and `GET /health`), `backend/app/schemas/{__init__,common,auth,repo}.py` (the Pydantic request/response models), `backend/app/security/__init__.py`, and `backend/app/features/{auth,repos,plan,indexing,context,reader}/__init__.py`.
**Depends on:** Layers 1–4 (config, DB, models, migrations) and, once built, Layers 5–6.
**Used by:** the frontend and any external client.

*Partially built. `main.py` defines the app and `GET /health`, and `schemas/` defines all Part 1 request/response models plus the documented endpoint contract. Every feature router and `security` is still an empty `__init__.py`.*

#### Study Notes for this layer

**What is `backend/app/main.py`?**
The FastAPI app factory (`create_app()`) plus the module-level `app = create_app()` that uvicorn imports as `app.main:app`.
*Why do we need it?* It builds the ASGI application, attaches CORS and error handling, and registers the first route (`GET /health`).
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

**What are the three global exception handlers?**
Handlers for `RequestValidationError` (422), `StarletteHTTPException` (its status code), and `Exception` (500), all returning `{"error": {"code", "message", "details"?}}`.
*Why do we need it?* Every error leaves the API in one consistent JSON shape instead of FastAPI's default `{"detail": ...}` or a raw traceback.
*What breaks without it?* Clients would parse several error formats, and unhandled errors could leak internals (the unhandled handler logs the traceback server-side and returns only a generic message).
*Think of it as:* a single standardized complaint form every department must use.

**What is `GET /health`?**
A dependency-free route returning `{"status": "ok"}`.
*Why do we need it?* Load balancers, uptime checks and the team need a cheap liveness probe.
*What breaks without it?* You can't tell at a glance whether the process is up.
*Think of it as:* a doorman answering "yes, we're open" without walking you through the building.

**What is `features/auth`?**
Reserved for signup, login, email verification, and password reset endpoints.
*Why do we need it?* Users need accounts, and the `User`/`EmailToken` models exist to support this.
*What breaks without it?* No one can register or log in.
*Think of it as:* the reception desk that issues your badge.

**What is `features/repos`?**
Reserved for adding and listing repositories.
*Why do we need it?* It is how a `Repo` row gets created so the pipeline has work.
*What breaks without it?* Users can't submit repos, so nothing downstream ever runs.
*Think of it as:* the intake form at the front desk.

**What is `features/plan`?**
Reserved for the plan feature.
*Why do we need it?* It exposes plan generation/review over analyzed repos.
*What breaks without it?* Plan functionality has no endpoint.
*Think of it as:* the meeting room where plans get discussed.

**What is `features/indexing`?**
Reserved for triggering indexing and reporting its status.
*Why do we need it?* Users need to start and watch the pipeline.
*What breaks without it?* Indexing can't be kicked off from the API.
*Think of it as:* the button that starts the washing machine.

**What is `features/context`?**
Reserved for the context-packing feature endpoints.
*Why do we need it?* It exposes the packer's results to clients.
*What breaks without it?* Packed context has no way out of the system.
*Think of it as:* the service window where a prepared order is handed over.

**What is `features/reader`?**
Reserved for the reader feature endpoints.
*Why do we need it?* It exposes reader-order guidance.
*What breaks without it?* Reading-order output can't be requested.
*Think of it as:* a guided tour desk.

**What is `schemas`?**
The Pydantic request/response models for the API: `common.py` (error/message envelopes), `auth.py` (auth requests, `TokenResponse`, `UserOut`, password rule), `repo.py` (`RepoCreate`/`RepoOut`/`RepoListOut`, GitHub URL parsing), re-exported from `__init__.py`.
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
Reserved for password hashing and JWT helpers.
*Why do we need it?* `requirements.txt` already includes `argon2-cffi` and `PyJWT` for this.
*What breaks without it?* Auth endpoints would have no safe hashing/token logic.
*Think of it as:* the vault where keys are made and checked.

---

### Layer 8: Frontend

**What it is:** The reserved folder for the browser UI.
**Why it exists:** To keep client code out of the backend and let the API stay headless.
**Files in it:** `frontend/.gitkeep` only.
**Depends on:** Layer 7 (HTTP API).
**Used by:** end users.

*Not implemented yet. The folder contains only a `.gitkeep`; `.gitignore` already anticipates Node/Next/Vite artifacts (`node_modules/`, `.next/`, `.vite/`).*

#### Study Notes for this layer

**What is `frontend/`?**
The planned home of the web client.
*Why do we need it?* Humans need a UI, not raw JSON.
*What breaks without it?* There is no visual way to use the product.
*Think of it as:* the showroom floor; the factory (API) works without it, but customers can't browse.

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

Two things actually run end to end right now: applying the database schema and serving a minimal HTTP API. First, here is exactly what happens when you run `alembic upgrade head` from `backend/` with the venv active:

1. **Entry (Layer 4).** The `alembic` CLI reads `backend/alembic.ini`, sees `script_location = %(here)s/alembic`, and loads `backend/alembic/env.py`.
2. **Wiring (Layer 4 -> 1/2/3).** `env.py` inserts `backend/` into `sys.path`, then imports `get_settings` (Layer 1), `Base` (Layer 2) and `app.models` (Layer 3). Importing `app.models` runs `models/__init__.py`, which imports `User`, `EmailToken`, `EmailTokenType`, and `Repo`, registering all three tables on `Base.metadata`.
3. **Config (Layer 1).** `get_settings()` reads `backend/.env`, validates it into a cached `Settings`, and returns `DATABASE_URL = "sqlite:///./repotrackr.db"`.
4. **URL + metadata (Layer 4).** `env.py` calls `config.set_main_option("sqlalchemy.url", ...)` with that URL and sets `target_metadata = Base.metadata`.
5. **Engine (Layer 4 -> 2).** `run_migrations_online()` builds an engine via `engine_from_config` and connects.
6. **Migration (Layer 4).** Alembic compares `alembic_version` against the revision chain and runs `upgrade()` in `9dbee76d77e4_create_users_email_tokens_repos.py`, which issues `CREATE TABLE` for `users`, `email_tokens`, and `repos`, plus indexes, foreign keys, the `email_token_type` enum, `uq_user_repo_url`, and defaults.
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
                         ▼
              backend/repotrackr.db  (3 tables + alembic_version)
```

### HTTP request flow (app factory)

When uvicorn imports `app.main:app`, the module builds the app and serves a first route:

1. **Startup (Layer 7).** `uvicorn app.main:app` imports `backend/app/main.py`, which calls `create_app()` and assigns `app = create_app()`.
2. **Config (Layer 1).** `create_app()` calls `get_settings()`, which reads `backend/.env` into the cached `Settings`.
3. **Middleware + handlers (Layer 7).** It builds the `FastAPI` object, adds `CORSMiddleware` using `settings.CORS_ORIGINS`, and registers the three exception handlers.
4. **Request (`GET /health`).** The route returns `{"status": "ok"}`.
5. **Errors.** A validation error returns 422, an HTTP error (e.g. unknown path -> 404) returns its own status code, and any unhandled error returns 500 — all in the same `{"error": {"code", "message", ...}}` shape.

```
Browser ──GET /health──► uvicorn ──► app/main.py:app
                                      │ CORS + exception handlers
                                      ▼
                                    200 {"status":"ok"}
```

When the feature routers land, the flow will extend: HTTP request -> `app/main.py` -> a `features/*` router -> `security`/`schemas` -> `get_db()`/`Base` -> database.

## Current Status

Working now (built and previously verified, see `docs/changes.md`):
- Settings & Configuration (`app/core/config.py`, `backend/.env`, `backend/.env.example`).
- Database Core (`app/core/database.py`).
- Data Models (`app/models/user.py`, `email_token.py`, `repo.py`, `__init__.py`).
- Schema Migrations — `alembic.ini`, `alembic/env.py`, and the first migration creating `users`, `email_tokens`, `repos`.
- HTTP API app factory (`app/main.py`): `create_app()`, CORS from `CORS_ORIGINS`, global JSON error handlers, and `GET /health`; runnable via `uvicorn app.main:app`.
- Request/response schemas (`app/schemas/{common,auth,repo}.py`) and the documented endpoint/mock contract (`docs/api_contract.md`, `docs/mock_responses.md`).

Not implemented yet:
- Security helpers (`app/security`) — password hashing and JWT.
- All feature routers (`app/features/*`: auth, repos, plan, indexing, context, reader).
- Deterministic pipeline and analysis (`app/pipeline/*`, `app/analysis/*`), background tasks (`app/tasks`).
- AI layer (`app/ai/*`, `app/agent`).
- Frontend (`frontend/` — `.gitkeep` only).
- Docker orchestration (`docker/docker-compose.yml` empty, no Dockerfile).
- Evals (`evals/*` — `.gitkeep` only) and helper scripts (`scripts/` — `.gitkeep` only).
- Tests (`backend/tests` — empty package).
- `README.md` (empty).

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
- Others (all have defaults): `APP_NAME`, `ENV`, `DATABASE_URL`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `FRONTEND_URL`, `CORS_ORIGINS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`.

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
`GET /health` answers as long as the app imports; the other routes (auth, repos, etc.) are not built yet, so unknown paths return the `http_error` JSON shape.

## Where You Can Help

- **Layer 7, `app/main.py`:** the app factory now exists — extend it by including the `features/*` routers (and any extra middleware) as they are built.
- **Layer 7, `app/security/`:** implement password hashing with `argon2-cffi` and JWT creation/validation with `PyJWT`, using `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`.
- **Layer 7, `app/schemas/`:** schemas for Part 1 exist — extend them (and `docs/api_contract.md`/`docs/mock_responses.md`) when new endpoints are added.
- **Layer 7, `app/features/auth/`:** wire the existing `User` and `EmailToken` models into signup/login/verify/reset endpoints, using `SMTP_*`/`EMAIL_FROM` for sending.
- **Layer 7, `app/features/repos/`:** add "add repo" and "list my repos" endpoints that write `Repo` rows (respect the `uq_user_repo_url` constraint) and use `get_db()`.
- **Layer 2/3:** register a second model change by adding a model then running `alembic revision --autogenerate`; test `render_as_batch` behavior on SQLite.
- **Layer 5, `app/pipeline/clone` + `cache`:** start the cloning/caching step that turns a `Repo` row into local files.
- **Layer 5, `app/analysis/retrieval`:** make sure every future AI claim can attach a real `file:line`, per the design rule.
- **Layer 9:** fill `docker/docker-compose.yml` and add a Dockerfile; stand up the `evals/` harnesses.
- **Tests:** add the first pytest cases under `backend/tests` (e.g. `Settings` validation, `get_db()` lifecycle, migration up/down).

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
