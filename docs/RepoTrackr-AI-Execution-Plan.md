# RepoTrackr AI - Execution Plan

One web interface that understands a Python repo and answers by query: how it is connected, where to start reading, what is done vs left against your plan, and a token-efficient prompt for what you want to build next.

**Split:** Part 1 is all the regular SDE / full-stack work (no AI, no analysis). Parts 2 to 4 concentrate on the pipeline and AI work.

## Summary

| Part | Theme | AI / LLM? | Ends with |
|---|---|---|---|
| 1 | Full-stack foundation: auth, email verification, password reset, repo records, pages | No | Complete, deployable app shell |
| 2 | Pipeline core: clone + index | No | Repo analyzed and visible in the UI |
| 3 | AI features: verifier, retrieval, reader guide, context packer | Yes | All 3 query types work |
| 4 | Agent layer, evals, hardening, demo | Yes | Measured and demo-ready |

---

## PART 1: Full-Stack Foundation (no pipeline, no AI)

**Goal:** a complete, production-style web app where a user signs up, verifies their email, logs in, resets a forgotten password, saves repo links, and sees every page. Nothing in Part 1 touches repo contents.

### Backend

**Setup**
- FastAPI project structure, SQLite + SQLAlchemy (Postgres-ready), Alembic migrations
- `.env` config, CORS, global error handling that returns clean JSON
- Pydantic schemas for every request and response

**Auth (email + password only, no Google login)**
- Signup with email + password (hash with argon2 or bcrypt, never store plain text)
- Password rules: minimum length, basic strength check
- Email verification: send a verification link with a signed, expiring token; block login until verified; resend-verification endpoint
- Login: JWT access token (short expiry) + refresh token
- Logout and `/me` endpoint
- Forgot password: request a reset link by email (always return the same response so emails cannot be guessed)
- Reset password: signed, expiring, single-use token; sets the new password
- Change password (logged-in) and delete account
- Rate limiting on login, signup, forgot-password and resend endpoints
- Email sending through SMTP (Mailtrap or a Gmail app password for dev, a real provider later)

**Repo records (a link saved, nothing more)**
- Add repo: validate that it is a public GitHub URL, parse owner and name
- List my repos, get one repo, delete a repo
- Block duplicates per user

**Database tables**
- `users` (id, email, password_hash, is_verified, created_at)
- `email_tokens` (id, user_id, type [verify / reset], token_hash, expires_at, used_at)
- `repos` (id, user_id, url, owner, name, `status` default `"added"`, created_at)

**Stubs for later**
- Endpoints for Parts 2 to 4 exist but return `{"status": "not_implemented"}` so the frontend is already wired

### Frontend (your team)

**Pages**
- Landing
- Signup
- Login
- Verify Email (landing page for the emailed link, plus "resend" option)
- Forgot Password
- Reset Password
- Dashboard (repo list with empty state)
- Add Repo
- Repo Detail (empty placeholder tabs: Overview, Reader, Plan, Context)
- Account Settings (change password, delete account)

**Behavior**
- Protected routes and automatic token handling (refresh on expiry)
- Loading, error and empty states on every page
- Form validation that matches the backend rules
- Responsive layout

### Shared

- **Day 1:** Pydantic schemas + API contract + mock responses, sent to the frontend team so nobody is blocked
- README with run instructions, `.env.example`, and a Postman or Swagger collection
- Tests for auth flows (signup, verify, login, reset) and repo CRUD
- Optional: Docker Compose for one-command local setup

### Not in Part 1

- Cloning repos, background tasks, parsing, indexing
- Any AI or LLM call
- Google or social login

### Done when

- A new user can sign up, verify by email, log in, reset a forgotten password, add and delete repo links, and open the detail page
- Expired, used and invalid tokens are all handled correctly
- Tests pass and the README lets a teammate run the whole app from scratch

---

## PART 2: Pipeline Core (clone + index, no LLM)

**Goal:** turn a saved repo link into a searchable index of the code.

### Backend

- **Clone:** shallow clone, size limit, timeout, no submodules, sandboxed, never execute any repo code
- **Status flow:** `added -> queued -> cloning -> indexing -> ready / failed` using FastAPI `BackgroundTasks`
- **AST indexer:** functions, classes, imports, FastAPI routes, tests, docstrings, each with `file:line`
- **Graph:** import/call graph with networkx
- **Chunking:** split code into symbol-level chunks
- **Cache:** keyed by commit SHA, re-index only changed files
- **Secrets:** strip `.env` files and keys before anything is stored
- **Endpoints:** start indexing, get status, get index summary (symbol counts, modules, entry points)
- Log index time per 10k lines of code

### Frontend

- Status badge with polling on the repo list and the detail page
- Repo Detail "Overview" tab: file tree, symbol counts, entry points, list of symbols with `file:line`
- Error state for failed clones, and a retry button

### Done when

You paste a small public Python repo, watch the status move to `ready`, and see its symbols and entry points in the UI.

---

## PART 3: AI Features (retrieval, verifier, reader, packer)

**Goal:** the three query types on top of the Part 2 index. Deterministic checks first, Gemini only where needed.

**Design rule:** deterministic analysis decides what is true (AST, graph, checks). The AI only retrieves, reasons over evidence and explains. Every claim cites `file:line`. If the AI is unavailable, the index and static checks still work.

### Backend (build in this order)

1. **Plan verifier**
   - YAML roadmap upload and validation
   - Deterministic checks: route exists, function exists, test exists, stub detection (`pass`, `TODO`, `NotImplementedError`)
   - Output per item: done / partial / missing / unknown, with evidence
   - Gemini only for semantic items, with Pydantic validation on every output
2. **Hybrid retrieval**
   - BM25 on identifiers + embeddings of signature and docstring
   - Graph expansion: callers, callees, tests, config, 1 to 2 hops
3. **Reader guide**
   - Reading order from entry points, centrality, module clusters
   - One-line module labels from Gemini
   - Mermaid diagram at cluster level
4. **Context packer**
   - Fill a token budget: full body for near code, signature only for far code
   - Output a compact MD plus a token-efficient prompt, with a token count
5. **Intent router**
   - Start with explicit mode selection in the UI, add automatic routing only if time allows
6. **Safety:** strip secrets before every LLM call, track invalid-output rate, log latency and cost per query

### Frontend

- **Plan tab:** upload YAML, status per item, click through to the cited code
- **Reader tab:** reading order list and Mermaid diagram
- **Context tab:** query box, compact MD output, copyable prompt, token count
- Query box with a mode selector

### Done when

All three tabs return real, cited answers on at least 2 repos, and the plan verifier still works with Gemini turned off.

---

## PART 4: Agent Layer, Evals, Hardening, Demo

**Goal:** make it agentic, prove it works, and make it safe to show.

### Backend

**Agent layer (LangGraph)**
- Multi-step investigation for ambiguous plan items (route -> DB call -> test)
- Tool-failure handling and retries
- Verify-by-rescan after each decision
- Trace and tool-call logging

**Evals (report results even if a component loses to a baseline)**

| What | Test set | Metrics | Baselines |
|---|---|---|---|
| Context packer | 20-30 tasks from closed PRs on 2-3 Python repos | Recall at token budget, tokens used | Full dump, grep top-k, embeddings only |
| Plan verifier | 40-60 hand-labeled plan items | Precision / recall of "done", false-done rate | LLM with whole repo, keyword match, deterministic only |
| Agent vs plain pipeline | Per-item traces | Tool-call accuracy, steps per item | Plain pipeline without agent |

**Hardening**
- Rate limiting, repo size limits, p50 / p95 latency and cost per query dashboards
- Invalid-LLM-output rate tracking

### Frontend

- Live agent trace view in the Plan tab
- Optional results page showing eval numbers
- Polish, empty states, demo mode with a preloaded repo

### Done when

Eval tables exist with real numbers and the full demo runs end to end.

---

## If Time Runs Short

**Cut in this order:** automatic intent router, then embedding-model comparison, then the Mermaid diagram, then the context packer.

**Never cut:** the plan verifier and the evals.

## Scope

**In:** Python repos only, web interface, builder and reader queries, evals.

**Out on purpose:** multi-language support, fine-tuning, mobile app, voice, vision, Google or social login.
