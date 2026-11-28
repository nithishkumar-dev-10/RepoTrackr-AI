# RepoTrackr AI — frontend

React 19 + TypeScript + Vite client for the RepoTrackr AI backend. It provides the landing/auth pages, account settings, the repository dashboard, the repo workspace (graph + Overview/Reader/Plan/Context tabs + ⌘K command bar) and a Developer page that lists endpoints and shows live API activity.

## Setup

```bash
npm install
cp .env.example .env        # optional: VITE_API_URL defaults to http://localhost:8000
npm run dev                 # http://localhost:5173
```

Environment variables (only `VITE_*` is exposed to the browser):

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Base URL of the FastAPI backend |
| `VITE_USE_MOCKS` | `false` | When `true`, the graph uses local mock data for demos; Part 3–4 query modes always have their own mock fallback |

The backend must allow the dev origin: add `http://localhost:5173` to `CORS_ORIGINS` in `backend/.env`.

## Commands

```bash
npm run typecheck   # tsc -b --noEmit
npm run lint        # oxlint
npm run build       # production build into dist/
```

There is no frontend test runner configured. Typecheck, lint and build are the automated checks.

## UI design tokens

`src/index.css` is the canonical source for colors, tints, radius, elevation and Tailwind utilities; `src/lib/designTokens.ts` mirrors the palette for SVG/WebGL fills that CSS variables cannot reach. Status colors and node-type hues derive from the same hue families, `Card accent` / `AccentIcon` provide tinted surfaces, and `src/styles/glow.css` defines the shared glow/progress effects. Edit the CSS and TS token files together.

## API boundary

`src/api/client.ts` is the single fetch wrapper: it prefixes `VITE_API_URL`, attaches the bearer token, retries once after a refresh on 401, parses the shared `{"error": {"code", "message"}}` envelope into `ApiError`, and logs each call for the Developer page. Auth failures dispatch `rt:auth-invalidated` so `AuthContext` returns to `anonymous` and stops protected pollers.

Live Part 2 calls in `src/api/galaxy.ts`: `startIndex`, `getIndexStatus`, `getIndexSummary` and `getGraph`. The Part 3–4 routes still return `501`, so those calls fall back to typed data in `src/mock/*` and are labelled "Not implemented yet" in the UI.

## State handling

Dashboard (repository list) and RepoWorkspace (repo, status, summary, graph) show explicit loading, error/Retry and empty states; a failed graph request no longer blanks the workspace. The landing, Developer and account-settings pages are static in this sense: they render local content or submit forms and use toasts/inline messages instead of async list states.

For the full file-by-file guide, see `docs/project_summary.md`; for endpoint contracts, see `docs/api_contract.md` and `docs/mock_responses.md`.
