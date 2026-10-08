# RepoTrackr AI - Agent Rules

## Working style
- We build in small steps. Only do what the current step's prompt asks. Never build ahead.
- Stop at the end of each step and wait for the next prompt.
- Never run or execute any code from repos we analyze later.

## RULE 1: Keep docs/project_summary.md current
docs/project_summary.md is the single source of truth for the project's current state. After every step, update it so a new developer could read only this file and understand the project. It must explain:
- WHAT: every folder, file, module and table, and what each one is
- WHY: why it exists and why it was designed this way
- HOW: how it works and how the pieces connect (request flow, auth flow, data flow)
- STATUS: what is done, what is in progress, what is next
Rewrite outdated sections instead of just appending. Keep it accurate, not long.

## RULE 2: Log every step in docs/changes.md
After each step, append a new entry to docs/changes.md (never delete old entries):
- Step number and name
- Date
- Files created / modified / deleted
- What changed and why, in plain language
- New commands, env variables, endpoints or migrations added
- Known issues or TODOs left behind

## End-of-step checklist (always do this)
1. Verify the work actually runs
2. Update docs/project_summary.md
3. Append to docs/changes.md
4. Give a short summary, then stop

## Structure is fixed
The folder structure was approved in Step 0.6. Do not create new top-level folders or move folders without asking me first. Put new code in the folder the structure assigns to it.
docker/ was added as a top-level folder in Step 0.7 (approved).
