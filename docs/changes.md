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
