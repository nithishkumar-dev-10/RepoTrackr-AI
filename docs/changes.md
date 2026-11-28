# Changes Log

Every step appends an entry here. Never delete old entries.

---

## Audit closeout - Task 7: full verification and real Part 2 E2E

- **Date:** 2026-11-28
- **Files created / modified / deleted:** modified `docs/project_summary.md` and `docs/changes.md`; no repository files created or deleted. The E2E driver lived in the approved OS temp folder, not in the repo.
- **What changed and why:** `docs/project_summary.md` now matches the verified current state: it documents the live `/graph` route, the redacted/dev-safe email fallback, correct per-file test counts, the fact that `safe_clone` is invoked by the HTTP background task, a Current verification section, and updated "Where You Can Help" notes (only Part 3–4 routers remain stubs; 301 tests exist). Stale claims about tokenized links in logs, 265/271 tests and missing HTTP wiring were removed.
- **New commands / env variables / endpoints / migrations:** none added. Verification used the existing commands plus a temporary E2E driver with `DATABASE_URL`, `CLONE_ROOT`, `SMTP_HOST=""` and `PYTHONPATH` set only for that process; the temp DB was migrated from zero to `c4d8e7a1b2f3` with Alembic.
- **Verification:** backend venv `python -m pytest -q` → **301 passed, 10 warnings in 7.35s**; `alembic check` → "No new upgrade operations detected."; `alembic current` → `c4d8e7a1b2f3 (head)`. Frontend `npm run typecheck` clean, `npm run lint` 0 warnings / 0 errors, `npm run build` succeeded (large-chunk advisory only). Real API E2E against `https://github.com/keleshev/schema` on a fresh temp DB: pre-ready `/index/summary` and `/graph` returned 409, `POST /index` returned 202, status ended `ready`; summary reported 20 file-tree entries, 4 files indexed/cached, 216 symbols, 3,335 LOC, 220 graph nodes, 266 graph edges, 4 centrality rows, `index_seconds` 1.953 and `seconds_per_10k_loc` 5.856; `/graph` returned 220 nodes, 266 edges, 2 clusters, `truncated: false`. No code from the cloned repository was executed; the indexer parses source with `ast`.
- **Known issues / TODOs:** browser UI confirmation is **SKIPPED** because no browser/Playwright/Puppeteer runner is installed in this environment; the API path is fully verified. `backend/repotrackr.db.bak` remains untracked in the working tree and must never be committed. Vite's large-chunk advisory and the missing frontend test runner remain documented limitations.

---

## Audit closeout - Task 6: documentation accuracy and dev-dependency verification

- **Date:** 2026-11-28
- **Files created / modified / deleted:** created `docker/.gitkeep`; deleted the zero-byte `docker/docker-compose.yml`; modified `README.md`, `frontend/README.md`, `docs/mock_responses.md`, `docs/project_summary.md`, `docs/changes.md`; no other files changed.
- **What changed and why:** the root README now describes Parts 1–2 as implemented, lists the live index/graph endpoints and 301 tests, documents the folder layout as it exists, and adds a Known limitations section (no AI/evals, CLI-only retrieval, single-process assumptions, graph caps, no Docker stack, no frontend test runner). `frontend/README.md` replaced the untouched Vite template with project-specific setup, env vars, commands, API boundary and state-handling notes. `docs/mock_responses.md` now shows the neutral 201 duplicate signup, the 401 `email_not_verified` login code, validation details without submitted `input`, live Part 2 index/summary/graph examples, and limits the 501 section to Part 3–4. The empty compose file was removed and replaced by `.gitkeep` so the approved `docker/` folder remains without a misleading placeholder.
- **New commands / env variables / endpoints / migrations:** none. `requirements-dev.txt` was installed into a fresh temporary venv (outside the repo) and `python -m pytest -q` reported **301 passed, 10 warnings in 7.92s** there, confirming the pinned dev requirements are sufficient.
- **Verification:** clean-venv install + pytest as above; `cd backend && .venv/bin/python -m pytest -q` still **301 passed**; `cd frontend && npm run typecheck && npm run lint && npm run build` clean (0 lint warnings).
- **Known issues / TODOs:** `docker/` still has no real compose file or Dockerfile; Large Vite chunks and the absence of a frontend test runner remain documented limitations. No new docs claims are unverified.

---

## Audit closeout - Task 5: frontend states, clean lint, static-page note

- **Date:** 2026-11-28
- **Files created / modified / deleted:** modified `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/RepoWorkspace.tsx`, `frontend/src/components/dashboard/MiniGraphThumb.tsx`, `frontend/src/components/workspace/PlanPanel.tsx`, `frontend/src/components/ui/button.tsx`, `frontend/src/components/ui/badge.tsx`, `README.md`, `docs/project_summary.md`, `docs/changes.md`; folded in the pre-existing Phase B frontend hardening edits to `frontend/src/api/client.ts`, `frontend/src/context/AuthContext.tsx`, `frontend/src/lib/tokenStorage.ts`; no files created or deleted.
- **What changed and why:** the Dashboard now has a single cancellation-guarded `load()` used by the first render, Refresh and Retry, with explicit skeleton, error/Retry and empty states; `RepoWorkspace` gained a Retry for the repository load alongside the existing graph/summary/status states. The four lint warnings are gone: `MiniGraphThumb` uses pure index-seeded values instead of mutating render state, `PlanPanel` uses prefix sums instead of a mutated cursor, and `button.tsx`/`badge.tsx` no longer export their `cva` variant helpers so React Fast Refresh can preserve component state (unused externally; prop types still exported). `README.md` states that loading/error/Retry/empty states are N/A on static pages (landing, Developer, account settings), which use toasts and inline form feedback. The earlier frontend auth hardening (401 refresh-retry with `rt:auth-invalidated` and token-generation guards, reflected in `AuthContext`/`client.ts`/`tokenStorage.ts`) was preserved here.
- **New commands / env variables / endpoints / migrations:** none.
- **Verification:** `cd frontend && npm run typecheck` passed; `npm run lint` → **0 warnings, 0 errors**; `npm run build` → succeeded (`✓ built in 649ms`, only the pre-existing large-chunk advisory). Backend tests were unchanged from Task 4 (301 passing).
- **Known issues / TODOs:** no frontend test runner is configured, so state transitions are verified by typecheck/lint/build and review only. Vite still reports large chunks (elk/Graph3D) as an advisory.

---

## Audit closeout - Task 4: machine-readable unverified-login code + backend auth hardening

- **Date:** 2026-11-28
- **Files created / modified / deleted:** created `backend/app/core/errors.py`; modified `backend/app/main.py`, `backend/app/features/auth/router.py`, `backend/tests/test_auth.py`, `docs/api_contract.md`, `docs/project_summary.md`, `docs/changes.md`, `frontend/src/api/auth.ts`, `frontend/src/lib/authErrors.ts`; folded in the pre-existing backend hardening edits to `backend/.env.example`, `backend/app/core/config.py`, `backend/app/core/email.py`, `backend/app/features/auth/dependencies.py`, `backend/app/security/{__init__,passwords,tokens}.py`, `backend/tests/conftest.py` and created `backend/tests/test_batch1_hardening.py`; no files deleted.
- **What changed and why:** `GET /auth/login` still answers an unverified account with 401 and the same neutral `"Invalid email or password"` text as a bad login, but now raises `EmailNotVerifiedError`, a typed `ApiHTTPException` whose `code` is copied into the shared `{"error": {...}}` envelope by the global handler. Clients can therefore offer verification without account enumeration from the message. `describeAuthError()` keys off `error.code === 'email_not_verified'` (keeping the old 403 branch as a fallback), and the stale 403 comment in `auth.ts` was corrected. The earlier Phase B backend auth hardening (neutral responses, dummy hash, random refresh `jti` with single-use consumption, token invalidation, required `exp`, unverified-token rejection, stripped validation input, CORS `*` rejection, extra rate limits) was preserved and committed here so each audit task has one commit. `docs/api_contract.md` now documents the new code, the graph endpoint that Task 3 added, and the real error envelope instead of `{"detail": ...}` placeholders.
- **New commands / env variables / endpoints / migrations:** error code `email_not_verified` on `POST /auth/login` only (HTTP 401 unchanged). No new endpoint, command or migration.
- **Verification:** `cd backend && .venv/bin/python -m pytest -q` → **301 passed, 10 warnings in 7.65s** (including the updated unverified-login assertions and the 13 Phase B hardening tests); `cd frontend && npm run typecheck` passed; `npm run lint` reported only the same 4 known warnings (0 errors).
- **Known issues / TODOs:** the code is emitted only when the password matches an unverified account; a probe with a wrong password stays indistinguishable by design. No frontend unit test runner exists, so the code-based branch is covered only by review/typecheck.

---

## Audit closeout - Task 3: real deterministic graph endpoint

- **Date:** 2026-11-28
- **Files created / modified / deleted:** created `backend/app/features/indexing/graph_out.py`, `backend/tests/test_graph_endpoint.py` and `frontend/src/lib/env.ts`, `frontend/.env.example`; modified `backend/app/schemas/indexing.py`, `backend/app/features/indexing/router.py`, `backend/app/tasks/__init__.py`, `frontend/src/types/graph.ts`, `frontend/src/api/galaxy.ts`, `frontend/src/pages/RepoWorkspace.tsx`, `docs/project_summary.md`, `docs/changes.md`; no files deleted.
- **What changed and why:** the indexing job now persists the full `build_graph()` output (nodes, edges, per-module centrality) in `index_summary`, because the clone folder is deleted after the job. A new `GET /repos/{repo_id}/graph` validates that stored summary and maps it to the frontend `Graph` contract in `graph_out.py`: module/class/function nodes get a cluster, normalized centrality, source line and `isEntry`, edges keep their typed `kind`, and clusters are derived from node paths. Responses are capped at 300 nodes and 1000 edges, with `truncated: true` and no dangling edges. The router prefix moved from `/repos/{repo_id}/index` to `/repos/{repo_id}` so `/graph` can live alongside `/index`, `/index/status` and `/index/summary` without changing those paths. On the client, `getGraph` calls the real endpoint by default; demo data is now opt-in via `VITE_USE_MOCKS=true` (typed through `src/lib/env.ts`, default `false`, documented in `frontend/.env.example`). `RepoWorkspace` fetches the graph separately from the repo so a 409 during indexing no longer blanks the page, and has explicit loading, error/Retry and empty states plus a capped-graph note.
- **New commands / env variables / endpoints / migrations:** `GET /repos/{repo_id}/graph` (auth required, 404 for foreign/missing repo, 409 until `ready`, 200 `GraphOut`); frontend `VITE_USE_MOCKS` (default `false`) and `VITE_API_URL` template at `frontend/.env.example`. No migration or backend env variable changed.
- **Verification:** `cd backend && .venv/bin/python -m pytest -q tests/test_graph_endpoint.py tests/test_indexing.py` → **15 passed**; full `cd backend && .venv/bin/python -m pytest -q` → **301 passed, 10 warnings in 7.32s**. `cd frontend && npm run typecheck` passed and `npm run lint` reported only the 4 known warnings (0 errors).
- **Known issues / TODOs:** graph nodes are limited to the stored Python index; repos indexing to `failed` keep showing the empty graph state until reindexed. `VITE_USE_MOCKS` affects only the graph (Part 3–4 stubs keep their own fallback). Existing summaries written before this change have no `graph_nodes`, so the endpoint returns an empty graph until those repos are reindexed.

---

## Audit closeout - Task 2: line-preserving secret redaction

- **Date:** 2026-11-28
- **Files created / modified / deleted:** created `backend/app/pipeline/clone/redaction.py` and `backend/tests/pipeline/test_redaction.py`; modified `backend/app/pipeline/clone/__init__.py`, `backend/app/pipeline/chunking/builder.py`, `backend/app/tasks/__init__.py`, `docs/project_summary.md`, `docs/changes.md`; no files deleted.
- **What changed and why:** added one reusable `redact_secrets(text) -> text` in the clone package that replaces credential-shaped values inside a line with `[REDACTED]` and emits exactly one output line per input line. It covers AWS/Google API keys, GitHub and Slack tokens, OpenAI-style keys, JWTs, PEM private-key blocks and string literals assigned to password/secret/token/api-key names, while leaving environment lookups, empty strings and documented placeholders untouched. Filename-based stripping was left as-is. The chunk builder now redacts every stored chunk (including cache hits, with token counts recomputed) and the background task redacts symbol docstrings and signatures before writing `index_summary`, so file:line citations remain correct and no stored source text carries a real key.
- **New commands / env variables / endpoints / migrations:** none.
- **Verification:** `cd backend && .venv/bin/python -m pytest -q tests/pipeline/test_redaction.py tests/pipeline/test_chunking.py tests/test_indexing.py` → **33 passed, 10 warnings**; full `cd backend && .venv/bin/python -m pytest -q` → **296 passed, 10 warnings in 7.04s**.
- **Known issues / TODOs:** no inline-secret redaction runs on CLI output that is only printed, nor on exception text written to `error_message`; the function is ready for reuse before Part 3 model calls.

---

## Audit closeout - Task 1: bring local database to head

- **Date:** 2026-11-28
- **Files created / modified / deleted:** modified `docs/changes.md`; created the gitignored backup `backend/repotackr.db.bak`; no tracked source files changed.
- **What changed and why:** backed up the local SQLite database before upgrading it, then applied the two pending Alembic migrations so the development database matches the models.
- **New commands / env variables / endpoints / migrations:** `cd backend && .venv/bin/python -m alembic upgrade head` (applied `09282e667a32 -> b7c1f2a9d4e6 -> c4d8e7a1b2f3`); `cd backend && .venv/bin/python -m alembic check`.
- **Verification:** `alembic current` reported `c4d8e7a1b2f3 (head)`; `alembic check` reported `No new upgrade operations detected.`
- **Known issues / TODOs:** the backup is deliberately untracked and must never be committed.

---

## Bug Hunt Phase B - Batch 1 (rows 1, 2, 6, 7, 8, 9, 10, 11, 12, 21, 22, 30)

- **Date:** 2026-11-25
- **Files created / modified / deleted:** created `backend/tests/test_batch1_hardening.py`; modified `backend/.env.example`, `backend/app/core/config.py`, `backend/app/core/email.py`, `backend/app/features/auth/dependencies.py`, `backend/app/features/auth/router.py`, `backend/app/main.py`, `backend/app/security/__init__.py`, `backend/app/security/passwords.py`, `backend/app/security/tokens.py`, `backend/tests/conftest.py`, `backend/tests/test_auth.py`, `docs/api_contract.md`, `docs/project_summary.md`, `frontend/src/api/client.ts`, `frontend/src/context/AuthContext.tsx`, `frontend/src/lib/tokenStorage.ts`, `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/RepoWorkspace.tsx`; no files deleted.
- **What changed and why:** Signup/login/resend/forgot now return neutral responses for unknown or duplicate accounts, and login verifies unknown users against a dummy argon2 hash. Refresh JWTs carry a random `jti`; refresh consumes the stored row with one conditional update and revoked rows are never reactivated. Password reset and change-password invalidate all refresh tokens plus unused RESET tokens. `decode_token` requires `exp`; `get_current_user` rejects unverified users. Validation errors strip `input`/`ctx`; SMTP fallback logs omit tokenized bodies; CORS rejects `*` because credentials are enabled. Added rate limits to verify-email, refresh, reset-password, change-password and logout. The frontend no-token branch sets `anonymous`, `client.ts` emits `rt:auth-invalidated` on final auth failure, `AuthContext` clears tokens and pollers stop, and token writes are guarded by a generation counter. Docs now state that rate limiting and startup recovery assume a single process.
- **New commands / env variables / endpoints / migrations:** new env vars `RATE_LIMIT_REFRESH`, `RATE_LIMIT_VERIFY_EMAIL`, `RATE_LIMIT_RESET_PASSWORD`, `RATE_LIMIT_CHANGE_PASSWORD`, `RATE_LIMIT_LOGOUT`; no new commands, endpoints or migrations. No schema change.
- **Verification:** the 13 new hardening tests plus 3 updated existing tests failed before the fixes (16 failed) and passed after. Full backend `python -m pytest -q -p no:cacheprovider` → **284 passed, 10 warnings in 15.77s**. Frontend `npm run typecheck` passed, `npm run lint` → 4 warnings / 0 errors (same pre-existing four), `npm run build` → 5551 modules transformed, built in 1.42s. Row 22 reproduced before fixing: `CORS_ORIGINS=["*"]` returned `Access-Control-Allow-Origin: https://evil.example` with `Access-Control-Allow-Credentials: true`. Fresh-profile CDP on a new Vite/backend pair showed `/login`, `/signup` and `/forgot-password` rendered with 0 localStorage keys and no spinner, and `/dashboard` redirected to `/login`; seeding invalid tokens produced 2 `rt:auth-invalidated` events, a `/login` redirect and 0 localStorage keys; a 1.5s delayed refresh that resolved after an invalidation event did not restore tokens. No commit or push was made.
- **Known issues / TODOs:** rows 21 and 24 are documented single-process assumptions, not fixed. Row 35 and the remaining Batch 2–4 rows are untouched. The generation counter was verified in a browser with a mocked delayed refresh, not against a real backend race. `docs/postman_collection.json` still contains older signup/duplicate/login/unverified examples; `docs/openapi.json` was regenerated but unchanged because these status changes are not declared in FastAPI schemas. The four frontend lint warnings remain out of scope; no frontend unit runner exists.

---

## Closeout Phase 4 - refresh-token revocation and atomic reset consumption

- **Date:** 2026-11-25
- **Files created / modified / deleted:** created `backend/alembic/versions/c4d8e7a1b2f3_add_refresh_tokens.py` and `backend/app/models/refresh_token.py`; modified `backend/app/features/auth/router.py`, `backend/app/models/__init__.py`, `backend/app/models/user.py`, `backend/app/schemas/auth.py`, `backend/tests/test_auth.py`, `frontend/src/api/auth.ts`, `frontend/src/context/AuthContext.tsx`, `docs/api_contract.md`, `docs/openapi.json`, `docs/postman_collection.json`, `docs/project_summary.md`, `docs/changes.md`; no files deleted.
- **What changed and why:** Added a dedicated `refresh_tokens` table storing only the SHA-256 hash of issued refresh JWTs plus `user_id`, `expires_at` and `revoked_at`. Login and refresh record that hash; refresh now requires a stored, unrevoked, unexpired hash, revokes it, and reissues a pair (an identical same-second JWT reactivates the same row rather than creating a duplicate). Logout accepts an optional `refresh_token` body and revokes that token server-side; password change and account deletion revoke all of the user's active refresh tokens. Reset-password consumption was tightened from a preliminary select plus update to one conditional `UPDATE ... WHERE used_at IS NULL AND expires_at > now ... RETURNING user_id` with a consumed-row check, so a second use cannot succeed. The frontend logout wrapper sends the stored refresh token, and the API contract, OpenAPI, Postman and project summary were updated to match the code.
- **New commands / env variables / endpoints / migrations:** new Alembic revision `c4d8e7a1b2f3` (`down_revision = b7c1f2a9d4e6`) creates `refresh_tokens`. `POST /auth/logout` now accepts an optional `LogoutRequest` body (`{"refresh_token": "..."}`); no new endpoints, packages or env variables. `POST /auth/refresh` behaviour changed from stateless to stored-hash validation.
- **Verification:** focused `tests/test_auth.py` → 42 passed, 5 warnings in 3.69s. Full backend `python -m pytest -q -p no:cacheprovider` → **271 passed, 5 warnings in 15.34s**. `alembic upgrade head && alembic check` on a temporary SQLite DB reached `c4d8e7a1b2f3` and reported "No new upgrade operations detected." Frontend `npm run typecheck` passed; `npm run lint` passed with 4 warnings and 0 errors (all pre-existing); `npm run build` passed with 5551 modules in 1.15s. `docs/openapi.json` and `docs/postman_collection.json` parse as JSON. No commit or push was made.
- **Known issues / TODOs:** Refresh is keep/reissue rather than guaranteed distinct rotation because JWT `iat`/`exp` have second resolution; the identical token reactivates its stored hash. The logout flow was not exercised in a browser this phase; it was verified through endpoint tests and the frontend wrapper. The four pre-existing lint warnings remain out of scope, there is no frontend test script, and 3D/WebGL rendering was not verified. Part 3–4 routes, Docker, evals and the AI layer are untouched.

---

## Closeout Phase 3 - hook warnings, cache-hit log, Dashboard 409

- **Date:** 2026-11-25
- **Files created / modified / deleted:** modified `frontend/src/context/AuthContext.tsx`, `frontend/src/pages/Dashboard.tsx`, `frontend/src/components/workspace/Graph3D.tsx`, `frontend/src/pages/RepoWorkspace.tsx`, `backend/tests/test_indexing.py`, `docs/project_summary.md`, `docs/changes.md`; no files created or deleted.
- **What changed and why:** Removed the nine targeted React hook warnings without eslint-disable comments. `AuthContext` and `Dashboard` load data directly inside cancellable mount effects; `Graph3D` reads reduced-motion through `useSyncExternalStore`; `RepoWorkspace` is keyed by the route id so its per-repo state resets without set-state-in-effect, derives `effectiveStatus`/`currentRepo` during render, and starts tab queries from the tab click instead of an effect. The cache regression test now asserts the real INFO log (`Index cache hit for repo … <sha>`) instead of relying only on elapsed time. The Dashboard Start button was exercised in a browser while the backend repo was made `cloning`, confirming the 409 toast instead of only checking the raw HTTP response.
- **New commands / env variables / endpoints / migrations:** none. No token, endpoint or schema change was made in this phase.
- **Verification:** `python -m pytest -q -p no:cacheprovider` → 266 passed, 5 warnings in 14.13s; the focused `tests/test_indexing.py` run → 10 passed, 5 warnings in 2.19s with the new caplog assertion. `npm run typecheck` passed, `npm run lint` passed with 4 warnings and 0 errors (all pre-existing: two `only-export-components`, two `immutability`; zero `set-state-in-effect`/`exhaustive-deps`), and `npm run build` passed with 5551 modules in 2.01s. Headless Chrome/CDP on repo 5 showed an enabled "Index" button, then after the backend state was changed to `cloning` and the button was clicked, showed "Already indexing / Indexing is already cloning for this repo."; captured `/index` responses were 200 then 409 and `Runtime.exceptionThrown` was empty.
- **Known issues / TODOs:** the four remaining lint warnings are outside this closeout. The WebGL context failure in headless Chrome still falls back to the tested 2D graph; 3D rendering was not verified. There is still no frontend test script, so browser checks remain CDP-based. No commit or push was made.

---

## Closeout Phase 2 - API docs synced to live Part 2

- **Date:** 2026-11-25
- **Files created / modified / deleted:** modified `docs/api_contract.md`, `docs/openapi.json`, `docs/postman_collection.json`, `docs/project_summary.md`, `docs/changes.md`; no files created or deleted.
- **What changed and why:** `docs/api_contract.md` no longer calls Part 2 a stub: it now documents `POST .../index` as 202 with the real `{"status":"queued","message":"Indexing queued."}` body and 409 while running, `GET .../status` as 200 with status/SHA/error, and `GET .../summary` as 200 with the full `IndexSummaryOut` shape plus 409/500 cases. `docs/openapi.json` was regenerated from the live app, replacing the three 501 responses with 202/200 and adding `IndexStartOut`, `IndexStatusOut`, `IndexSummaryOut`, `IndexSymbolOut` and the updated `RepoOut`. `docs/postman_collection.json` now has real 202/200 success examples for the same three requests; its seven remaining 501 examples are only the Part 3–4 stubs. `docs/project_summary.md` also had stale test-command counts corrected to the current 266-test suite.
- **New commands / env variables / endpoints / migrations:** none. The documented endpoints did not change; only their response documentation changed.
- **Verification:** `python -m pytest -q -p no:cacheprovider` → 266 passed, 5 warnings in 15.19s. `npm run typecheck`, `npm run lint` (13 warnings, 0 errors) and `npm run build` (5551 modules, built in 2.16s) passed. Both JSON docs parse successfully. No 501 remains for Part 2 in the contract, OpenAPI or Postman artifacts.
- **Known issues / TODOs:** Part 3–4 routes are still documented as 501 stubs. Lint warnings are unchanged from Phase 1; Phase 3 will fix the `RepoWorkspace.tsx` and `Dashboard.tsx` ones properly.

---

## Closeout Phase 1 - tab crash fix

- **Date:** 2026-11-25
- **Files created / modified / deleted:** created `frontend/src/components/workspace/PanelErrorBoundary.tsx`; modified `frontend/src/pages/RepoWorkspace.tsx`, `docs/project_summary.md`, `docs/changes.md`; no files deleted.
- **What changed and why:** `RepoWorkspace` stored the `{data, demo}` result returned by the mock query wrappers directly into `ModeResult`, which expects `{response, demo}`. Reading `results.reader.response.readingOrder` therefore crashed, and Plan/Context had the same mismatch. `runQuery` now unwraps `result.data` into `response` and keeps `result.demo`, so Reader/Plan/Context receive the shape they expect and still show "Not implemented yet". A `PanelErrorBoundary` keyed by the active tab now wraps `ModePanel` and renders an error message plus Retry instead of a blank page if a future tab throws.
- **New commands / env variables / endpoints / migrations:** none. No mock files were deleted and no Part 3/4 logic was added.
- **Verification:** backend `python -m pytest -q -p no:cacheprovider` → 266 passed, 5 warnings in 15.84s. Frontend `npm run typecheck` passed; `npm run lint` passed with 13 warnings, 0 errors; `npm run build` passed (5551 modules). Headless Chrome/CDP opened Overview → Reader → Plan → Context on ready repo 2 in order: every tab stayed selected, body content remained present, no error-boundary message appeared, Reader/Plan/Context each showed "Not implemented yet", and `Runtime.exceptionThrown` was empty.
- **Known issues / TODOs:** no frontend test script exists, so tab behaviour was verified only through typecheck/build/lint and headless CDP. The pre-existing lint warnings outside this phase remain; Phase 3 will fix the new ones in `RepoWorkspace.tsx` and `Dashboard.tsx`.

---

## Step 2B - Part 2 workspace UI

- **Date:** 2026-11-25
- **Files created / modified / deleted:** created `frontend/src/components/workspace/OverviewPanel.tsx`; modified `frontend/src/api/galaxy.ts`, `frontend/src/api/repos.ts`, `frontend/src/types/pipeline.ts`, `frontend/src/types/repo.ts`, `frontend/src/pages/RepoWorkspace.tsx`, `frontend/src/pages/Dashboard.tsx`, `frontend/src/components/dashboard/RepoCard.tsx`, `frontend/src/components/workspace/StageTimeline.tsx`, `frontend/src/components/workspace/ModeTabs.tsx`, `frontend/src/components/workspace/ModePanel.tsx`, `frontend/src/components/workspace/ReaderPanel.tsx`, `frontend/src/components/workspace/PlanPanel.tsx`, `frontend/src/components/workspace/ContextPanel.tsx`, `frontend/src/components/workspace/CommandBar.tsx`, `docs/project_summary.md`, `docs/changes.md`; no files deleted.
- **What changed and why:** Built the Part 2-only UI. `src/api/galaxy.ts` now calls the live index endpoints directly and has no mock fallback for Part 2; the mock fallback remains only for the `501` Part 3–4 routes. `OverviewPanel.tsx` renders the real stored summary only after the status is `ready`, with explicit loading, empty, error and not-ready states; it shows commit SHA, symbol counts, modules, entry points, file tree and each symbol's `file:line_start`–`line_end`. `RepoWorkspace.tsx` polls `/index/status` every 2.5s while active, clears the timer on terminal status or unmount, fetches `/index/summary` only at `ready`, starts indexing from repo detail, and handles a start `409` by showing "Already indexing" and refreshing status. `Dashboard.tsx` polls while any visible repo is active and handles `409`. `RepoCard.tsx` and the workspace show backend statuses (`queued`, `cloning`, `indexing`, `ready`, `failed`) rather than the old UI-only names. `StageTimeline.tsx` shows the real stages, `error_message` and Retry. The fake-evidence badges in Reader/Plan/Context were relabelled "Not implemented yet"; their logic was otherwise left alone.
- **New commands / env variables / endpoints / migrations:** no new commands, packages, env variables or migrations. No endpoint changed; the frontend now consumes `POST /repos/{id}/index`, `GET .../index/status` and `GET .../index/summary`.
- **Verification:** `cd frontend && npm run typecheck` passed; `npm run lint` passed with 13 warnings and 0 errors (no new errors; some new hook-warning warnings in `RepoWorkspace.tsx` and `Dashboard.tsx`); `npm run build` passed (Vite 8.3.4, 5550 modules transformed). No frontend test script or `*.test.*`/`*.spec.*` files exist, so no unit tests were run. Headless Chrome/CDP against a temporary backend DB used `https://github.com/encode/httpx`: detail showed "Not indexed" + "Start indexing"; after clicking Start, active and Ready badges appeared; Overview showed ENTRY POINTS, SYMBOLS, `line n:` entry evidence and `.py:n–n` symbol evidence; the dashboard showed Ready. A second repo (`fastapi/typer`) confirmed workspace unmount cleanup: 2 status requests at unmount and still 2 after 6s on the dashboard. A bad URL repo showed Failed, `[git_failed]` text and Retry in the timeline. Screenshot/result artifacts were written only under the OS temp directory. Temporary backend, Vite and Chrome processes were stopped; no commit or push was made.
- **Known issues / TODOs:** Entering Reader/Plan/Context can crash because `src/api/galaxy.ts` returns `{data, demo}` for those mock routes while `RepoWorkspace.tsx` reads `results.<mode>.response` (`frontend/src/pages/RepoWorkspace.tsx:295-305`). The "Not implemented yet" labels exist in the three panels (`ReaderPanel.tsx:68`, `PlanPanel.tsx:111`, `ContextPanel.tsx:120`) but the Reader label could not be verified in-browser because of that crash; this is outside the Part 2 UI scope. Headless Chrome could not create a WebGL context, so `CanvasErrorBoundary` fell back to the 2D graph; 3D rendering was not verified. `docs/api_contract.md`, `docs/openapi.json` and `docs/postman_collection.json` still describe the Part 2 routes as `501` stubs. Lint warnings remain.

---

## Step 2A verification - live backend flow and cache fix

- **Date:** 2026-11-25
- **Files created / modified / deleted:** modified `backend/app/pipeline/cache/__init__.py`, `backend/tests/test_indexing.py`, `docs/project_summary.md`, `docs/changes.md`; no files created or deleted.
- **What changed and why:** Exercised the live Part 2 flow against a real public GitHub repository before UI work. An unchanged re-index was re-cloning because `is_index_current()` required `repo.status == "ready"` while `POST /repos/{id}/index` had already written `queued`. The cache predicate now accepts `ready` or `queued` and still requires both `commit_sha` and a stored summary SHA match. Added an endpoint-level regression test that fails if cloning happens on an unchanged re-index.
- **New commands / env variables / endpoints / migrations:** no new endpoints, migrations, packages or env variables. Regression test: `backend/tests/test_indexing.py::test_reindex_through_endpoint_uses_cache`.
- **Verification:** `cd backend && source .venv/bin/activate && python -m pytest -q -p no:cacheprovider` → **266 passed, 5 warnings in 11.94s**. Live API flow with `https://github.com/sloria/environs`: signup `201`, verify `200`, login `200`, add repo `201` with `status: "added"`; POST `/index` → `202 {"status":"queued"}`; status transitions `cloning @0.002s`, `indexing @5.631s`, `ready @5.689s`; summary SHA `2a2733d98050174d69f80729eec99e80521ed2d7`, 30 file-tree entries, 37 classes / 181 methods / 40 functions, 258 total symbols, 15 files indexed, 273 graph nodes, 124 edges, 2752 LOC. Double-start returned `409` with "Indexing is already cloning for this repo." A bad URL ended `failed` with a readable `[git_failed]` error and `/summary` returned `409`. Another user's repo ID returned `404` for status, summary and start. After the fix, an unchanged re-index returned in `0.008s`. No code from analyzed repositories was executed.
- **Known issues / TODOs:** no explicit "Index cache hit" INFO line was observed; cache behaviour is evidenced by the timing and the regression test. `docs/api_contract.md`, `docs/openapi.json` and `docs/postman_collection.json` still document the Part 2 routes as stubs.

---

## Step 2A - Part 2 backend wiring

- **Date:** 2026-11-25
- **Files created / modified / deleted:** created `backend/alembic/versions/b7c1f2a9d4e6_add_repo_index_fields.py`, `backend/app/schemas/indexing.py`, `backend/tests/test_indexing.py`; modified `backend/app/models/repo.py`, `backend/app/schemas/repo.py`, `backend/app/features/indexing/router.py`, `backend/app/tasks/__init__.py`, `backend/app/pipeline/cache/__init__.py`, `backend/app/main.py`, `backend/tests/test_stubs.py`, `docs/project_summary.md`, `docs/changes.md`; no files deleted.
- **What changed and why:** Wired Part 2 end to end on the backend only. A new Alembic revision adds `repos.error_message` and `repos.index_summary`; the repo model and `RepoOut` expose them. `POST /repos/{repo_id}/index` now sets `queued`, rejects concurrent runs, and schedules `run_index_pipeline` with FastAPI `BackgroundTasks`. The task runs clone → AST index → graph → chunk through the existing pipeline modules, persists `commit_sha` after clone, updates status at each step, stores a JSON summary for the overview endpoint, cleans up clone folders on failure, and logs seconds per 10k lines of code. `GET .../index/status` returns status/SHA/error; `GET .../index/summary` returns real file tree, symbol counts, modules, entry points and symbols with file:line, or 409 before ready. `pipeline/cache` now implements commit-SHA hit detection; unchanged files still reuse `ChunkStore.file_cache`. Startup recovery marks repos left in `queued`/`cloning`/`indexing` as failed. Part 3–4 stubs were left alone; only their old Part 2 stub cases were removed from `test_stubs.py`.
- **New commands / env variables / endpoints / migrations:** endpoints changed from 501 to live: `POST /repos/{repo_id}/index` (202/409), `GET /repos/{repo_id}/index/status`, `GET /repos/{repo_id}/index/summary` (200/409). New Alembic revision `b7c1f2a9d4e6` (`down_revision = 09282e667a32`). No new env vars, packages or CLI commands.
- **Verification:** `source .venv/bin/activate && python -m pytest -q -p no:cacheprovider` → 265 passed, 5 warnings. `alembic upgrade head && alembic check` against a temporary SQLite DB → "No new upgrade operations detected." No servers started and no analyzed repository was executed.
- **Known issues / TODOs:** Phase B is not started: frontend still uses `added`/`indexing`/`indexed`/`error` statuses and the mock fallback in `src/api/galaxy.ts`, so it cannot yet show the new `queued`/`cloning`/`indexing`/`ready`/`failed` flow or real summary. `docs/openapi.json`, `docs/api_contract.md` and Postman were not regenerated in this step. Live GitHub clone/size failures were not exercised against the network; failure paths were tested with monkeypatched clone errors.

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

---

## Step 1H - Repo CRUD

- **Date:** 2026-10-10
- **Files created:**
  - `backend/app/features/repos/router.py` - the repo-records feature on an `APIRouter(prefix="/repos", tags=["repos"])`: `POST /repos` (201 `RepoOut`), `GET /repos` (200 `RepoListOut`, newest first), `GET /repos/{repo_id}` (200 `RepoOut`), `DELETE /repos/{repo_id}` (200 `MessageResponse`). Every route depends on `features/auth/dependencies.get_current_user`. `create_repo` re-parses the URL with `parse_github_url`, lowercases `owner`/`name`/`url`, checks for a duplicate and also catches `IntegrityError` from `uq_user_repo_url` (both 409 `"Repo already added"`), and inserts `Repo(status="added")`. `get`/`delete` query by `id` **and** `user_id`, so a missing repo and another user's repo both return the same 404 `"Repo not found"`. No network call and no cloning.
  - `backend/tests/test_repos.py` - 19 endpoint tests.
- **Files modified:**
  - `backend/app/main.py` - imports and `app.include_router(repos_router)` so `/repos` is mounted.
  - `docs/api_contract.md` - `Repo URL rule` now notes owner/name/url are stored lowercased; expanded the Repos Notes (auth required on all routes, case-insensitive 409, format-only validation/no clone, list scoping/newest-first, ownership-scoped 404s).
  - `docs/project_summary.md` - intro, tree (`features/repos/router.py`, `tests/test_repos.py`), stack note, Layer 7 (files, status, new study notes for the repos feature and its router), The Full Flow (HTTP flow mounts both routers + new "Repos request flow" section), Current Status, Running It Locally (live `/repos` endpoints + `test_repos.py`), Where You Can Help.
  - `docs/changes.md` - this entry.
- **What changed and why:** Built the "save a repo link" half of Part 1 with no pipeline or AI. Reused `parse_github_url` (Step 1E) and `get_current_user` (Step 1G-a). To make the existing `uq_user_repo_url` constraint block duplicates **case-insensitively** (GitHub is case-insensitive) with **no model or migration change**, `owner`, `name` and `url` are lowercased on write, so `github.com/PSF/Requests` and `github.com/psf/requests` collide. Ownership is enforced by scoping `get`/`delete` to `user_id`, which makes a foreign repo and a nonexistent repo return an identical 404 (no id probing).
- **New commands / env variables / endpoints / migrations:**
  - New endpoints: `POST /repos`, `GET /repos`, `GET /repos/{repo_id}`, `DELETE /repos/{repo_id}` (all require a Bearer access token).
  - New env variables: none. New dependencies: none.
  - No new migrations.
  - Test command unchanged: `python -m pytest tests/ -q` (now 74 passed: 18 security + 37 auth + 19 repos).
- **Known issues / TODOs:**
  - Case-insensitive duplicates are enforced by lowercasing on write plus the existing `uq_user_repo_url`. There is no functional index on `lower(url)`; the raw constraint is case-sensitive, so every write must go through this router.
  - New repos stay at `status = "added"`; the `added -> queued -> cloning -> indexing -> ready/failed` flow is Part 2.
  - `GET /repos` returns the full list with no pagination (fine for Part 1).
  - The 409 path does a pre-check query and also relies on the DB constraint as a race guard; under SQLite concurrent inserts are serialized, but a Postgres deploy would still rely on the unique constraint.

---

## Step 1I - Part 1 finish: Part 2-4 stubs, README, docs, OpenAPI + Postman

- **Date:** 2026-10-10
- **Files created:**
  - `backend/app/features/repos/dependencies.py` - `get_owned_repo` dependency: loads a `Repo` by `id` **and** `user_id` (via `get_current_user` + `get_db`), else 404 `"Repo not found"`. The single source of the ownership-scoped 404 rule, reused by the repos `get`/`delete` routes and every repo-scoped stub.
  - `backend/app/schemas/stub.py` - `StubQueryRequest` (`query`, `mode`) for the Part 3 stub bodies.
  - `backend/app/features/indexing/router.py` - stubs `POST /repos/{repo_id}/index`, `GET .../index/status`, `GET .../index/summary` (tag `stubs`).
  - `backend/app/features/plan/router.py` - stubs `POST /repos/{repo_id}/plan` (multipart YAML file) and `GET /repos/{repo_id}/plan`.
  - `backend/app/features/reader/router.py` - stub `GET /repos/{repo_id}/reader`.
  - `backend/app/features/context/router.py` - stubs `POST /repos/{repo_id}/context` and `POST /repos/{repo_id}/query` (JSON `StubQueryRequest`).
  - `backend/app/agent/router.py` - stub `GET /repos/{repo_id}/agent/trace`.
  - `backend/tests/test_stubs.py` - 29 tests (per repo-scoped stub: 501 happy path, 401 without token, 404 for another user's repo; plus a nonexistent-repo 404 and the public `/evals` stub).
  - `docs/openapi.json` - generated OpenAPI 3.1 spec (23 paths).
  - `docs/postman_collection.json` - Postman v2.1 collection generated from the spec with `openapi-to-postmanv2` (`folderStrategy=Tags`), then given `baseUrl`/`bearerToken` collection variables and a Login test script that saves `access_token` into `{{bearerToken}}`.
- **Files modified:**
  - `README.md` - written from scratch: what the project is, design rule, tech stack, Part 1 status, setup from scratch (venv, pip install, copy `.env.example`, `alembic upgrade head`), run (`python -m uvicorn app.main:app --reload`), tests, folder structure, and links to `docs/api_contract.md` / `docs/mock_responses.md` / `docs/openapi.json` / `docs/postman_collection.json`.
  - `backend/app/main.py` - imports and mounts the five stub routers and declares `GET /evals` (tag `stubs`, 501, no auth).
  - `backend/app/features/repos/router.py` - `get`/`delete` now depend on `get_owned_repo` (same behavior, less duplication).
  - `backend/app/schemas/__init__.py` - export `StubQueryRequest`.
  - `docs/api_contract.md` - intro notes the stubs are registered; each Part 2/3/4 section documents the shared 401/404 behavior and the plan/context/query request bodies; schema index gains `StubQueryRequest`.
  - `docs/project_summary.md` - intro, tree (all new files), stack note, Layer 6 (`agent/router.py`), Layer 7 (files, status, study notes for the repos dependency and each stub feature, stub request flow), Current Status, Running It Locally (Swagger/OpenAPI + `/repos` live + stubs 501), Where You Can Help.
  - `docs/changes.md` - this entry.
- **What changed and why:** Closed out Part 1's backend. Every Part 2–4 endpoint from the contract is now registered as a `501` stub that enforces auth and repo ownership, so the frontend can integrate against realistic behavior now. Added the top-level README, exported the OpenAPI spec, generated a usable Postman collection, and verified the env template and git ignores. No model, migration, dependency or `.env.example` changes were needed.
- **New commands / env variables / endpoints / migrations:**
  - New endpoints (all stubs, `501 {"status": "not_implemented"}`): `POST /repos/{repo_id}/index`, `GET /repos/{repo_id}/index/status`, `GET /repos/{repo_id}/index/summary`, `POST /repos/{repo_id}/plan`, `GET /repos/{repo_id}/plan`, `GET /repos/{repo_id}/reader`, `POST /repos/{repo_id}/context`, `POST /repos/{repo_id}/query`, `GET /repos/{repo_id}/agent/trace`, `GET /evals`.
  - New env variables / dependencies / migrations: none.
  - New docs artifacts: `docs/openapi.json`, `docs/postman_collection.json` (generated with `npx openapi-to-postmanv2`, not a runtime dependency).
  - Test command unchanged: `python -m pytest tests/ -q` (now 103 passed: 18 security + 37 auth + 19 repos + 29 stubs).
- **Part 1 "Done when" checklist:**
  - Sign up, verify, log in, reset forgotten password, add/delete repo links - **PASS** (all covered by `test_auth.py` / `test_repos.py`; full suite green).
  - Open the detail page - **PARTIAL**: the backend supports it (`GET /repos/{repo_id}`), but the frontend pages are the separate team deliverable and `frontend/` is still empty.
  - Expired, used and invalid tokens handled - **PASS** (`test_auth.py` covers verify + reset token expiry/used/invalid).
  - Tests pass - **PASS** (103 passed).
  - README lets a teammate run from scratch - **PASS** (`README.md` written; commands verified against the repo).
- **Known issues / TODOs:**
  - Frontend pages (Landing/Signup/Login/Verify/Forgot/Reset/Dashboard/Add Repo/Repo Detail/Account) are not in this repo — owned by the team. "Open the detail page" stays partial until they exist.
  - Docker Compose (optional) was skipped: no Dockerfile yet and it would be unverified, so it is left empty rather than documented as working.
  - The Postman collection's sample values are schema placeholders (`<string>`, `<email>`); use `docs/mock_responses.md` for realistic bodies.
  - Stub request bodies are validated for shape only (`StubQueryRequest`, required plan file); nothing is processed.

---

## Frontend build - full React app (phases 1-8)

- **Date:** 2026-10-12
- **Branch:** `frontend-redesign`; one commit per phase after the Step 0.3 base (`5dd0ffe`).
- **Files created (all under `frontend/`, nothing outside it was edited until this docs entry):**
  - Tooling/config: `frontend/package.json`, `vite.config.ts`, `tsconfig*.json`, `.oxlintrc.json`, `components.json`, `index.html`, `README.md`, `.env.example`, `public/favicon.svg`, `public/icons.svg`.
  - Entry + theme: `src/main.tsx` (providers + `MotionConfig reducedMotion="user"`), `src/App.tsx` (routes), `src/index.css` (design tokens).
  - API + mocks + types: `src/api/client.ts` (fetch wrapper, bearer token, 401 refresh-retry, error envelope, **new API activity logging**), `src/api/auth.ts`, `src/api/repos.ts`, `src/api/galaxy.ts` (single boundary that tries the real endpoint then falls back to mock data with a `demo` flag), `src/mock/*` (typed mocks, moved out of `src/api/mock/`), `src/types/*`.
  - Libs: `src/lib/env.ts`, `utils.ts`, `tokenStorage.ts`, `motion.ts`, `validation.ts`, `authErrors.ts`, `github.ts`, `graphLayout.ts`, `planStatus.ts`, `endpoints.ts`, `apiLog.ts`.
  - Contexts/components: `src/context/AuthContext.tsx`, `ToastContext.tsx`; `src/components/{AppLayout,Navbar,Logo,guards,PageTransition,Counter,ScrollReveal,MagneticButton,SpotlightCard,CitationChip}.tsx`; `src/components/ui/*` (Radix-based primitives incl. new `dialog.tsx`).
  - Landing: `src/components/landing/{MiniGraph,InteractiveDemo,FeatureCards,PipelineSection}.tsx`.
  - Auth: `src/components/auth/{FloatingInput,PasswordStrength,NodeNetwork,AuthSplitLayout}.tsx`.
  - Dashboard: `src/components/dashboard/{MiniGraphThumb,TrackRepoModal,RepoCard}.tsx`.
  - Workspace: `src/components/workspace/{ModeTabs,StageTimeline,CommandBar,GraphView,Graph2D,Graph3D,GraphList,GraphCanvas->CanvasErrorBoundary,CodeBlock,ReaderPanel,PlanPanel,ContextPanel,ModePanel,NodeInspector}.tsx`.
  - Pages: `src/pages/{Landing,Signup,Login,VerifyEmail,Dashboard,RepoWorkspace,Developer,NotFound}.tsx`.
- **Files deleted:** `frontend/_draft/` (it existed but was empty, so there was nothing to port from it).
- **What changed and why:** Built the entire browser client against the existing FastAPI backend. Phase 1 (pre-existing) + Phase 2 established the routing shell, auth context, navbar and page transitions; Phase 3 the landing page with an interactive demo and a scroll-driven pipeline; Phase 4 the signup/login/verify-email pages; Phase 5 the dashboard (track-repo modal + repo cards + staged status); Phase 6 the repo workspace (dark 3D galaxy canvas on the left, resizable light panel on the right, Reader/Plan/Context tabs, ⌘K command bar, staged indexing timeline, 2D/List fallbacks); Phase 7 the three query modes (Reader reading-order with shiki snippets, Plan status ring + evidence, Context token budget + tiers + copyable prompt); Phase 8 the Developer page (endpoint catalog + live API activity inspector) plus polish (mobile layout, `prefers-reduced-motion`, and a WebGL error boundary that degrades to the 2D graph).
- **Design rule honoured:** deterministic analysis is the source of truth; the UI only explains and every claim shows a `file:line` citation. Copy avoids "zero hallucinations"/"deterministic query modes" in favour of "Every claim cites real code (file:line)." and "Static analysis decides what is true. AI only retrieves and explains."
- **New commands / env variables / endpoints / migrations:**
  - New env var for the frontend: `VITE_API_URL` (default `http://localhost:8000`); documented in `frontend/.env.example` (a real `frontend/.env` is gitignored). No secret is committed.
  - Frontend commands (from `frontend/`): `npm install`, `npm run dev` (Vite on `http://localhost:5173`), `npm run build`, `npm run typecheck`, `npm run lint`.
  - No backend endpoints, migrations or dependencies were added.
- **Backend CORS note (needs a config change, NOT made here):** the Vite dev server runs on `http://localhost:5173`, but `backend/.env.example` / `Settings.CORS_ORIGINS` default to `http://localhost:3000`. To let the browser call the API during development, set `CORS_ORIGINS` in `backend/.env` to include `http://localhost:5173` (and `http://127.0.0.1:5173`). The backend was left untouched per the task rules.
- **Known issues / TODOs:**
  - Endpoints the backend still returns `501` for (index, index/status, index/summary, plan, reader, context, query, agent/trace, evals) are shown with a visible **"Demo data"** badge; the app calls the real route first and falls back to typed mock data.
  - `npm run build` passes; the only build output is the expected "chunks larger than 500 kB" warning (the 3D canvas and Mermaid are lazy-loaded into separate chunks).
  - Lint is warning-only (no errors): three pre-existing shadcn warnings plus benign `set-state-in-effect` warnings from data-loading effects.
  - `GET /repos` has no pagination yet, so the dashboard lists everything the user has tracked.

---

## Pipeline PHASE 1 - Safe clone

- **Date:** 2026-10-17
- **Files created:**
  - `backend/app/pipeline/clone/clone.py` - `safe_clone(url, CloneConfig)`: URL validation, shallow clone (`--depth 1 --single-branch --no-tags`), commit-SHA read, size/timeout enforcement, secret stripping.
  - `backend/app/pipeline/clone/errors.py` - `CloneError` + `CloneErrorCode` (`invalid_url`, `git_not_found`, `git_failed`, `timeout`, `size_exceeded`, `empty_repo`).
  - `backend/app/pipeline/clone/filters.py` - `SKIP_DIR_NAMES`, secret-file detection (`is_secret_file`, `is_skipped_dir`) and `clean_repo()`.
  - `backend/app/pipeline/clone/models.py` - `CloneConfig` and `CloneResult` (Pydantic).
  - `backend/tests/pipeline/__init__.py`, `backend/tests/pipeline/conftest.py` (offline `make_git_repo()` / `repo_url` fixtures using local `file://` repos), `backend/tests/pipeline/test_clone.py` (29 tests).
  - `backend/alembic/versions/09282e667a32_add_commit_sha_to_repos.py` - migration adding `repos.commit_sha`.
- **Files modified:**
  - `backend/app/core/config.py` - added `CLONE_ROOT` (`data/clones`), `CLONE_MAX_SIZE_MB` (200), `CLONE_TIMEOUT_SECONDS` (120).
  - `backend/.env.example` - documented the three new clone variables.
  - `backend/app/models/repo.py` - added nullable `commit_sha` column (`String(64)`).
  - `backend/app/schemas/repo.py` - `RepoOut.commit_sha: str | None = None`.
  - `backend/app/pipeline/clone/__init__.py` - re-exports the clone public API.
  - `.gitignore` - added `backend/data/` for the runtime clone sandbox.
  - `docs/project_summary.md` - tree, Layers 3/4/5, intro, status, env vars, commands, help.
  - `docs/changes.md` - this entry.
- **What changed and why:** Implemented the first deterministic pipeline step: a repository URL becomes a local, secrets-free folder plus its 40-char commit SHA. The clone is sandboxed (hooks and template dirs disabled, shell bypassed, no repo code executed), shallow, and bounded by size and time limits that fail cleanly with a typed `CloneError`. `.git`, ignored dirs (`node_modules`, `venv`, `.venv`, `__pycache__`, ...) and secret files (`.env`, `*.pem`, `*.key`, `id_rsa`, ...) are removed after the SHA is read; `.env.example`-style templates are kept. The commit SHA can now be saved on the `Repo` row.
- **New commands / env variables / endpoints / migrations:**
  - Env vars: `CLONE_ROOT`, `CLONE_MAX_SIZE_MB`, `CLONE_TIMEOUT_SECONDS`.
  - Migration: `09282e667a32` adds `repos.commit_sha` (batched `ALTER TABLE`, SQLite-safe).
  - Test command: `python -m pytest tests/pipeline/test_clone.py -q` (29 passed); full suite `python -m pytest -q` (132 passed).
  - No new Python dependencies (stdlib `subprocess`/`shutil`/`pathlib` + existing Pydantic); the `git` binary is required at runtime and for the tests.
  - No HTTP endpoint added yet.
- **Known issues / TODOs:**
  - `safe_clone` is not yet wired to the indexing endpoint or a background task, so the SHA is not yet persisted to a `Repo` row by the app (the column and migration are ready).
  - The pre-clone GitHub size probe calls `api.github.com` best-effort; if it is unreachable the clone still proceeds and is checked after cloning instead.
  - `data/clones/` is gitignored and can be safely deleted to reset the sandbox.

---

## Step 2 - AST indexer

- **Date:** 2026-10-20
- **Files created:**
  - `backend/app/pipeline/indexer/models.py` - `Symbol` (name, kind, file, `line_start`/`line_end`, signature, docstring, `parent`), `ImportRef` (module, names, alias, level), `CallRef`, `FileIndex`, `RepoIndex`, `SymbolKind`.
  - `backend/app/pipeline/indexer/parser.py` - `parse_source(source, file)` / `parse_file(path)`: walks Python's `ast` and records functions, classes, methods, imports and calls without importing or executing the analyzed code.
  - `backend/app/pipeline/indexer/repo.py` - `index_repo(folder)`: walks a folder with `IGNORED_DIRS` / `IGNORED_FILE_PREFIXES` / `IGNORED_FILE_SUFFIXES`, skips unparsable files with a logged reason, returns a `RepoIndex`.
  - `backend/app/pipeline/indexer/detect.py` - `is_test_file` and `find_entry_points` (`__name__ == "__main__"` guards, FastAPI/Flask route decorators, argparse/Click/Typer CLIs).
  - `backend/app/pipeline/indexer/__main__.py` - CLI entry point printing `kind | name | file:line` rows and a summary.
  - `backend/app/pipeline/indexer/__init__.py` - re-exports the public API.
  - `backend/tests/pipeline/test_indexer.py` - 24 tests.
- **Files modified:** none outside the new package (no dependency, env var, endpoint or migration).
- **What changed and why:** Built the deterministic index the rest of the pipeline reads from. `parse_source` turns source text into `Symbol`/`ImportRef`/`CallRef` records with exact line ranges taken from the AST, so every later claim can cite `file:line`. Classes and methods record their dotted `parent` (`Dog.bark`), signatures are reconstructed with `ast.unparse`, and the first body docstring is kept. Entry-point detection exists because the graph step needs a defensible place to start a reading order. The indexer never imports the target code — it only parses it.
- **New commands / env variables / endpoints / migrations:**
  - Command (from `backend/`): `python -m app.pipeline.indexer <folder>`.
  - Tests: `python -m pytest tests/pipeline/test_indexer.py -q` (24 passed); full suite at this step: 156 passed.
  - No new dependencies, env vars, HTTP endpoints or migrations.
- **Known issues / TODOs:**
  - Python-only: only `.py` files are parsed; other languages are ignored.
  - Not wired to any HTTP route or background task, and nothing persists a `RepoIndex` yet.
  - Files that fail to parse are skipped and recorded in `RepoIndex` with a parse error rather than failing the whole run.
  - Import/call resolution is syntactic; dynamic imports and runtime aliasing are out of scope.

---

## Step 3 - Code graph and reading order

- **Date:** 2026-10-20
- **Files created:**
  - `backend/app/pipeline/graph/models.py` - `GraphNode` (module or symbol, `file`), `GraphEdge` (`import` / `call`), `CentralityScore` (in-degree, PageRank, combined `score`), `GraphResult`.
  - `backend/app/pipeline/graph/builder.py` - `build_graph(repo_index)`: module and symbol nodes, import edges resolved through dotted/relative imports and package `__init__.py`, call edges resolved through import bindings, in-degree + PageRank centrality, entry modules, Mermaid text.
  - `backend/app/pipeline/graph/reading_order.py` - `reading_order(...)`: breadth-first from entry modules, following imports, ties broken by centrality, cycle-safe.
  - `backend/app/pipeline/graph/mermaid.py` - `mermaid_diagram(result)`: Mermaid flowchart text for the graph.
  - `backend/app/pipeline/graph/__main__.py` - CLI entry point printing central modules, reading order and the diagram.
  - `backend/app/pipeline/graph/__init__.py` - re-exports the public API.
  - `backend/tests/pipeline/test_graph.py` - 16 tests.
- **Files modified:** `backend/requirements.txt` - added `networkx==3.7`.
- **What changed and why:** Turned the flat index into a graph so connections and importance become explicit. Modules are nodes (`core/config.py`) and so are symbols (`core/config.py:get_settings`); `import` edges connect modules and `call` edges connect symbols, both resolved statically against the indexed file set. Each module gets a `CentralityScore` that adds its normalized in-degree to its normalized PageRank, and the reading order walks from detected entry points breadth-first so a newcomer starts where execution starts. The Mermaid renderer gives the frontend a diagram without a graphing library.
- **New commands / env variables / endpoints / migrations:**
  - Command (from `backend/`): `python -m app.pipeline.graph <folder>`.
  - Dependency: `networkx` (added to `backend/requirements.txt`).
  - Tests: `python -m pytest tests/pipeline/test_graph.py -q` (16 passed); full suite at this step: 172 passed.
  - No env vars, HTTP endpoints or migrations.
- **Known issues / TODOs:**
  - Not wired to any HTTP route (the frontend's graph is still demo data); nothing persists a `GraphResult`.
  - Resolution is static and best-effort: conditional/dynamic imports, `importlib`, and re-exports beyond simple bindings will be missed.
  - Python-only, because it consumes the indexer's `RepoIndex`.
  - Reading order reflects imports and centrality, not runtime behaviour.

---

## Step 4 - Chunking with tiktoken and SQLite cache

- **Date:** 2026-10-21
- **Files created:**
  - `backend/app/pipeline/chunking/models.py` - `Chunk` (id, name, kind, file, line range, text, `token_count`, `file_hash`, `commit_sha`, `too_large`), `ChunkSet`, `MAX_TOKENS = 2000`.
  - `backend/app/pipeline/chunking/builder.py` - `build_chunks(folder, commit_sha, db_path)`: one chunk per function/class/method, a `# file:line` header, class chunks with signature + docstring + method names, tiktoken `cl100k_base` counts, per-file sha256, cache reuse.
  - `backend/app/pipeline/chunking/store.py` - `ChunkStore`: SQLite `chunks` keyed by `(commit_sha, chunk_id)` and `file_cache` keyed by `(file, file_hash)`.
  - `backend/app/pipeline/chunking/__main__.py` - CLI entry point (`--sha`, `--db`) printing totals, cache counts, timing and the largest chunks.
  - `backend/app/pipeline/chunking/__init__.py` - re-exports the public API.
  - `backend/tests/pipeline/test_chunking.py` - 11 tests.
- **Files modified:** `backend/requirements.txt` - added `tiktoken==0.14.0`.
- **What changed and why:** Produced the retrievable units: symbol-sized chunks with honest size numbers, stored per commit. Each chunk's text starts with `# file.py:line`, so a chunk names its own source; class chunks keep the signature, docstring and method names while method bodies live in their own chunks, so no code is stored twice. Token counts use tiktoken's `cl100k_base`; anything over 2000 tokens is flagged `too_large` but never split, because splitting a function would break its citation. The SQLite store keeps each commit's chunk set separately and a `file_cache` row per `(file, content hash)` so re-runs skip unchanged files instead of re-parsing them.
- **New commands / env variables / endpoints / migrations:**
  - Command (from `backend/`): `python -m app.pipeline.chunking <folder> [--sha SHA] [--db PATH]`.
  - Dependency: `tiktoken` (added to `backend/requirements.txt`); the tokenizer must be downloadable/cached, otherwise the build fails loudly with a clear message.
  - Storage: `backend/data/chunks.db` by default (`--db` overrides); `backend/data/` is gitignored.
  - Tests: `python -m pytest tests/pipeline/test_chunking.py -q` (11 passed); full suite at this step: 183 passed.
  - No env vars, HTTP endpoints or migrations.
- **Known issues / TODOs:**
  - Python-only, because it consumes the indexer's `Symbol` records.
  - Not wired to any HTTP route or background task; no `Repo.status`/`Repo.commit_sha` update.
  - `too_large` chunks are flagged, not split, so a very long function stays one oversized chunk.
  - The cache is local SQLite only; changing the chunking strategy makes old `file_cache` rows stale (they are keyed by content hash, not by strategy version).

---

## Step 5 - BM25 retrieval and failure notes

- **Date:** 2026-10-21
- **Files created:**
  - `backend/app/pipeline/retrieval/tokenizer.py` - `tokenize(text)`: lowercase word tokens shared by indexing and querying; splits `snake_case`, `camelCase`/`PascalCase`, acronyms, letter/digit boundaries and paths; drops one-character tokens.
  - `backend/app/pipeline/retrieval/index.py` - `BM25Index` (rank_bm25 `BM25Okapi` over one commit's chunks), `load_index(commit_sha, db_path)`, `default_commit_sha()`, `UnknownCommitError`.
  - `backend/app/pipeline/retrieval/models.py` - `SearchResult` (chunk id, symbol, kind, file, line range, score, token count).
  - `backend/app/pipeline/retrieval/queries.py` - batch runner: one query per line, prints the top 5 per query.
  - `backend/app/pipeline/retrieval/__main__.py` - CLI entry point (`--k`, `--sha`, `--db`) printing the commit and ranked results.
  - `backend/app/pipeline/retrieval/__init__.py` - re-exports the public API.
  - `backend/tests/pipeline/test_retrieval.py` - 19 tests.
  - `backend/data/queries.txt` - the 10 test queries (5 exact names, 5 plain-word ideas). `backend/data/` is gitignored, so this file is local-only.
  - `backend/data/bm25_failure_notes.md` - per-query correct answer, top 3 results, hit/miss and reason, plus the summary and failure patterns. Local-only for the same reason.
- **Files modified:** `backend/requirements.txt` - added `rank-bm25==0.2.2` and `numpy==2.5.4`.
- **What changed and why:** Added the deterministic retrieval baseline, with no AI. The index is built over exactly one commit's stored chunks; each chunk's searchable text repeats the symbol name three times and adds the file path, signature, first docstring and body identifiers (keywords removed), so an exact-name query has a fair chance against short schema classes. Query and index both use the same tokenizer, so `verify_token` matches "verify token". Missing DBs, missing tables and unknown commit SHAs raise clear errors instead of crashing. The measured baseline is written down rather than assumed: 7/10 queries hit in the top 3 — exact names 5/5 (ranks 2, 3, 3, 1, 1), plain-word queries 2/5 — with three documented failure patterns (vocabulary mismatch, generic-word capture plus short-chunk bias, usage chunks outranking definitions).
- **New commands / env variables / endpoints / migrations:**
  - Commands (from `backend/`): `python -m app.pipeline.retrieval "<query>" [--k N] [--sha SHA] [--db PATH]` and `python -m app.pipeline.retrieval.queries <file>`.
  - Dependencies: `rank-bm25`, `numpy` (added to `backend/requirements.txt`).
  - Tests: `python -m pytest tests/pipeline/test_retrieval.py -q` (19 passed); full suite: **202 passed**.
  - No env vars, HTTP endpoints or migrations; `POST /repos/{repo_id}/query` is still a `501` stub.
- **Known issues / TODOs:**
  - Retrieval is not wired to any HTTP endpoint or to the frontend; it is CLI/library only.
  - No embeddings or reranking (that is the fix the failure notes point to), so plain-word queries with vocabulary mismatch still miss.
  - Results depend on running the chunking step first; a missing or empty DB produces a clear error.
  - `backend/data/queries.txt` and `backend/data/bm25_failure_notes.md` are gitignored, so the baseline and notes are not committed with the code.
  - The failure notes end with "Drafted by the agent, reviewed by me: PENDING" — human review of the notes is still outstanding.

---

## Clone security fix - URL allow-list narrowed to public GitHub HTTPS

- **Date:** 2026-10-21
- **Files created / modified:**
  - `backend/app/pipeline/clone/clone.py` - `ALLOWED_SCHEMES` is now `{"https"}`; new `_validate_github_url` (https scheme, host exactly `github.com`, `/owner/repo` path, no credentials/ports/query/fragment, no leading `-`, no whitespace or control characters); the clone body moved into `_clone_repository`; `_probe_github_size_kb` now probes only `https` + `github.com`.
  - `backend/tests/pipeline/test_clone.py` - the offline `file://` tests now go through the test-only `clone_local_fixture` helper; added allow-list tests (accepted GitHub URLs, rejected schemes/hosts/credentials/ports/query/fragment/dash/whitespace, and "git never runs for a rejected URL").
  - `docs/project_summary.md` - the clone URL allow-list known issue is marked fixed.
- **What changed and why:** `safe_clone` is the entry point the app will call once cloning is wired to the API, so it must not let a logged-in user point it at a local path or an internal host (SSRF). It now accepts only `https://github.com/<owner>/<repo>` (`.git` optional) and rejects everything else with `CloneError("invalid_url")`: the `file`, `ssh`, `git` and `http` schemes and every other scheme, any host that is not exactly `github.com` (including `github.com.evil.com`, `evilgithub.com`, `www.github.com` and `github.com.`), embedded `user:pass@` credentials, explicit ports, query strings, fragments, URLs starting with `-` (git option injection) and URLs holding whitespace or control characters. Local `file://` clones stay possible for the offline tests through `clone_local_fixture`, a helper that lives in the test file and only accepts local `file://` paths, so no production code path can clone a local path.
- **New commands / env variables / endpoints / migrations:** none. Tests: `python -m pytest tests/pipeline/test_clone.py -q` (74 passed); full suite: **247 passed**.
- **Known issues / TODOs:**
  - `safe_clone` is still not wired to any endpoint; when it is, the route must hand the user-supplied URL to `safe_clone` unchanged, so the allow-list stays the only gate.
  - The clone still trusts the remote repository; the pre-flight size probe and the post-clone size check are the only size limits.
  - `docs/project_summary.md` still shows the old test counts (202 passing, `test_clone.py` 29) in its status sections; they are now 247 and 74.

---

## Pipeline PHASE 1b - Clone cleanup / retention

- **Date:** 2026-10-17
- **Files created:**
  - `backend/app/pipeline/clone/cleanup.py` - `remove_clone(path, root)`, `configured_clone_root()`, `clone_workspace(url, config)`, `sweep_stale_clones(max_age_seconds, root)`.
  - `backend/tests/pipeline/test_cleanup.py` (16 tests).
- **Files modified:**
  - `backend/app/pipeline/clone/clone.py` - failure paths now delete the partial folder through `remove_clone` (via a best-effort `_discard` helper); `git_not_found` also cleans up. Public behavior unchanged.
  - `backend/app/pipeline/clone/__init__.py` - re-exports the cleanup API.
  - `backend/app/core/config.py` - added `CLONE_STALE_MAX_AGE_SECONDS` (default 3600).
  - `backend/.env.example` - documented `CLONE_STALE_MAX_AGE_SECONDS`.
  - `backend/app/main.py` - FastAPI `lifespan` runs `sweep_stale_clones` once on startup, wrapped in `try/except` so a sweep error never blocks startup.
  - `docs/project_summary.md` - tree, Layer 5 (`pipeline/clone` cleanup study note), Current Status, help.
  - `docs/changes.md` - this entry.
- **What changed and why:** Clones are temporary scratch space: only derived data and the commit SHA are kept, the folder is deleted as soon as it is no longer needed. `clone_workspace()` is a context manager that always removes the folder in `finally` (success, exception, timeout, failed clone). `remove_clone()` only deletes paths that resolve inside the clone root (refuses the root itself, outside paths and `..` tricks), unlinks symlinks instead of following them, and makes read-only git objects writable so deletion succeeds; a missing folder returns `False`. `sweep_stale_clones()` deletes direct child folders older than the max age (mtime), logs and continues past a single failure, and never touches anything outside the root.
- **New commands / env variables / endpoints / migrations:**
  - Env var: `CLONE_STALE_MAX_AGE_SECONDS` (default 3600).
  - Test command: `python -m pytest tests/pipeline/test_cleanup.py -q` (16 passed); full suite `python -m pytest -q` (148 passed = 103 previous + 29 clone + 16 cleanup).
  - No new Python dependencies (stdlib only).
  - No new HTTP endpoint or migration.
- **Known issues / TODOs:**
  - `safe_clone` is still not wired to any endpoint or task, so `clone_workspace` is not used by the app yet — **TODO:** wrap the pipeline in `clone_workspace` when it is built.
  - The startup sweep only sees the configured `CLONE_ROOT`; other roots are swept by passing `root=` explicitly.

---

## Hygiene - merge conflicts, schema defaults and pipeline diff cleanup

- **Date:** 2026-11-24
- **Files modified:**
  - `docs/project_summary.md` - removed all unresolved conflict markers by keeping the up-to-date descriptions (clone cleanup, indexer/graph/chunking/retrieval CLIs, 263-test count, complete env var list) over the stale "empty folders" side; corrected the Part 1 status to match the frontend present at that point (no forgot/reset/settings pages).
  - `docs/changes.md` - removed conflict markers around the Stage 2 and clone-cleanup entries, keeping both histories; this entry.
  - `README.md` - corrected the stale "frontend is empty" claim and the follow-up that over-listed unbuilt pages; added the React/TypeScript/Vite stack and updated the folder map.
  - `backend/app/models/user.py` - added `server_default=false()` to `is_verified` so `create_all` matches migration `9dbee76d77e4`.
  - `backend/app/models/repo.py` - added `server_default="added"` to `status` so `create_all` matches migration `9dbee76d77e4`.
  - `backend/app/pipeline/clone/clone.py` - reviewed the existing uncommitted diff only; no further edits. It removes the leftover conflict-marker block and the unused `shutil` import.
  - `backend/tests/pipeline/test_cleanup.py` - kept the existing test-only `file://` clone helper (the production allow-list accepts only GitHub HTTPS URLs) and added the same `safe_clone` monkeypatch to the timeout and oversized tests. Without it those two tests failed with `invalid_url` instead of reaching the timeout/size paths; all five offline cleanup tests now use the helper.
- **What changed and why:** The merge left literal conflict markers in the living docs and the ORM defaults did not carry the database-level defaults already present in the first migration, so tests that build the schema with `create_all` produced a slightly different database shape. The docs now render cleanly and describe the code that actually exists; the model defaults match the migration. Two offline cleanup tests were repaired so the full suite passes.
- **New commands / env variables / endpoints / migrations:** none. Existing verification: `python -m pytest -q -p no:cacheprovider` and `alembic check` from `backend/`.
- **Known issues / TODOs:** Part 2–4 endpoints remain `501` stubs; the pipeline is still not wired to the API. `git grep` reports zero conflict markers in tracked files. No commit was made.

---

## Part 1 gaps - password recovery, account settings and docs reconciliation

- **Date:** 2026-11-24
- **Files created:**
  - `backend/tests/test_schema_defaults.py` - 2 raw-`INSERT` regression tests proving `users.is_verified` and `repos.status` carry the same database defaults as migration `9dbee76d77e4` (from the earlier hygiene work in this same batch).
  - `frontend/src/pages/ForgotPassword.tsx` - email form for `POST /auth/forgot-password`; shows one generic "check your email" message whether or not the account exists.
  - `frontend/src/pages/ResetPassword.tsx` - reads `?token=`, validates the new password with the backend's rules, posts to `POST /auth/reset-password`.
  - `frontend/src/pages/AccountSettings.tsx` - profile summary, `POST /auth/change-password`, and `DELETE /auth/account` behind a type-your-email confirmation.
- **Files modified:**
  - `frontend/src/App.tsx` - added `/forgot-password` and `/reset-password` under `GuestRoute`, `/settings` under `ProtectedRoute`/`AppLayout`.
  - `frontend/src/components/Navbar.tsx` - user menu now links to Account settings.
  - `frontend/src/pages/Login.tsx` - login form links to Forgot password.
  - `docs/project_summary.md` - front tree, intro, Layer 8 study notes, Current Status and part status now describe the three new pages; all 7 conflict blocks from the merge were resolved by keeping the accurate pipeline descriptions and adding the clone-cleanup note; test counts refreshed to 265 with the real per-file breakdown.
  - `docs/changes.md` - conflict markers around the Step 2–5 and clone-cleanup entries were removed while keeping both histories; previous hygiene entry clarified; this entry.
  - `README.md` - removed the claims that the frontend is absent and the pipeline is empty; added the frontend stack and folder-map entries.
- **What changed and why:** The backend already exposes forgot/reset/change-password and delete-account, but the UI had no pages for them, so those features were unreachable without calling the API directly. The new pages reuse the existing typed auth wrappers and the shared auth layout/validation components. The committed merge markers in both living docs made them unusable as guides, so they were resolved from the real files rather than by picking a side.
- **New commands / env variables / endpoints / migrations:** none. Routes added are frontend-only (`/forgot-password`, `/reset-password`, `/settings`); no backend endpoint, env var or migration changed.
- **Verification:** backend `python -m pytest tests/ -q` → 265 passed; `alembic check` → no new upgrade operations; frontend `npm run typecheck` and `npm run build` pass; `git grep` finds no conflict markers.
- **Known issues / TODOs:** `GuestRoute` redirects already-signed-in users away from `/forgot-password` and `/reset-password`; they can use Account settings instead. The reset token is pasted manually because the backend email link carries it as a token, not a deep link to the page. Part 2–4 endpoints are still `501` stubs and the pipeline is not wired to the API. No commit was made.

---

## Tests - schema defaults regression and bug scan

- **Date:** 2026-11-24
- **Files created:** `backend/tests/test_schema_defaults.py` (2 tests).
- **Files modified:** `README.md`, `docs/project_summary.md`, `docs/changes.md`.
- **What changed and why:** Added raw-SQL regression tests for the defaults added to `User.is_verified` and `Repo.status`: each inserts a row that omits the column and asserts the database supplies `False` / `"added"`. This pins the ORM/migration parity fix instead of relying on `alembic check`, which does not compare server defaults by default. README and the living summary were reconciled with the password-recovery/account-settings pages and the new 265-test count (the in-tree `test_clone.py` count of 29 was also stale; it is 74).
- **Verification:** backend `python -m pytest -q -p no:cacheprovider` → **265 passed**, 5 pre-existing warnings; `alembic check` → no new upgrade operations; frontend `npm run typecheck` → clean; `npm run lint` → 10 pre-existing warnings, no errors; no conflict markers in tracked or worktree files.
- **Known issues / TODOs:** No test failures or new bugs found. Frontend lint warnings (React immutability / setState-in-effect / fast-refresh) are pre-existing and not fixed here. No commit was made.
