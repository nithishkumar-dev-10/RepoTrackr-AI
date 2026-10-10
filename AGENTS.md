# RepoTrackr AI - Agent Rules

## Working style
- We build in small steps. Only do what the current step's prompt asks. Never build ahead.
- Stop at the end of each step and wait for the next prompt.
- Never run or execute any code from repos we analyze later.
- The venv is at backend/.venv. Run all commands from backend/ with it activated. Never install a package without adding it to requirements.txt.

## RULE 1: Keep docs/project_summary.md current
docs/project_summary.md describes ONLY what exists in the codebase right now: what each folder, file, table and env variable is, how the pieces connect, and how the workflow runs. It must not contain the part-wise plan, roadmap, scope lists or future features (those live in docs/RepoTrackr-AI-Execution-Plan.md). After every step, read the actual files, then update the affected sections so a new developer could read only this file and understand the code. Rewrite outdated sections instead of appending. Never describe something as working unless it was verified.

## RULE 2: Log every step in docs/changes.md
After each step, append a new entry to docs/changes.md (never delete old entries):
- Step number and name
- Date
- Files created / modified / deleted
- What changed and why, in plain language
- New commands, env variables, endpoints or migrations added
- Known issues or TODOs left behind

## Design rule
Deterministic analysis decides what is true (AST, graph, checks). The AI only retrieves, reasons over evidence and explains. Every claim cites file:line. If the AI is unavailable, the index and static checks must still work.

## End-of-step checklist (always do this)
1. Verify the work actually runs
2. Update docs/project_summary.md from the real files
3. Append to docs/changes.md
4. Give a short summary, then stop

## Structure is fixed
The folder structure was approved in Step 0.6. Do not create new top-level folders or move folders without asking me first. Put new code in the folder the structure assigns to it.
docker/ was added as a top-level folder in Step 0.7 (approved).

## Maintaining project_summary.md and changes.md

### project_summary.md = how the project works RIGHT NOW
- It is a living guide for contributors. It describes the current state only, not history.
- When a new feature is added, do NOT rewrite the file or regenerate it.
- Find the layer/section where the feature belongs and add it there, with proper flow:
  - add it to the Project Structure tree if new files were created
  - add the layer entry or study notes (what it is, why we need it, what breaks without it, analogy) in the correct layer
  - update "The Full Flow" only if the feature changes the main flow
  - update Current Status (move the item to "Working now")
- Keep the same writing style and structure already used in the file.
- Do NOT write things like "added on...", "new feature", "updated in this version", or any change notes inside project_summary.md. Write the feature as if it was always part of the project.
- If a feature is modified or removed, edit or remove only the affected parts.

### changes.md = what changed and when
- Every change (new feature, fix, refactor, removal) is logged in changes.md, not in project_summary.md.
- Add a new entry at the top: date, short title, what changed, files touched.
- Never delete old entries.

### Order of work after any feature
1. Implement the feature
2. Update project_summary.md (targeted insert only, no rewrite)
3. Add the entry to changes.md
