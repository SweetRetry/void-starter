---
name: verify-web
description: Verify Void Starter in a real browser when reproducing a UI bug, checking a changed user journey, or capturing E2E evidence. Covers articles, Chat and attachments, with an executable local smoke suite.
---

# Verify web

Use this project-local entry point from any agent. Commands run at the repository root. Read [features/README.md](features/README.md) and select every entry point affected by the change before driving the app.

## Launch

Requires macOS or Linux, Node 24+ and the workspace's pnpm version. Install workspace dependencies with `pnpm install --frozen-lockfile` if missing. Install Playwright's headless Chromium once per machine. On Linux CI, use `pnpm exec playwright install --with-deps --only-shell chromium` to include system libraries.

```sh
pnpm exec playwright install --only-shell chromium
pnpm e2e
```

The runner copies the current app and packages into a temporary workspace, excluding local env files, connection records and persisted data. It shares installed dependencies but gives Vite its own cache directory. It applies local migrations, forces local Cloudflare bindings and starts the dev server on an available loopback port with `--strictPort`. Empty D1 is the seed for smoke. Readiness requires both the article and an empty Chat loader to render successfully.

Each invocation owns its workspace, port and evidence directory. Concurrent agents can run separately without sharing D1 or R2. Do not install dependencies while a run is active. The smoke suite never submits a turn or calls Workers AI.

The script launches its own headless Chromium with an isolated browser context. It works from a terminal or CI without an agent-specific browser service. Manual journeys in the feature map can use any available browser tool with equivalent controls and evidence capture.

## Doctor

The runner prints `Ready` only after checking the owned server and usable routes. To diagnose that instance while it is running, use its printed URL.

```sh
pnpm e2e --doctor http://127.0.0.1:5173
```

Replace the port with the actual run's port. This read-only check requires HTTP 200 and recognizable rendered content at `/` and a fresh `/c/<uuid>`. It checks local app and database readiness, not AI credentials or build identity. For identity, use the runner's `result.json`, `server.log` and owned PID. Never attach to an unexplained existing server just because the port answers.

## Drive

`scripts/e2e-browser.js` drives actual links and the composer through Playwright. It checks literal headings, URLs and Send state. `pnpm e2e` runs every automated journey in the feature map. A smoke pass covers only those journeys.

For a changed feature beyond smoke, use its map's selectors and expected state. Connected journeys require a dedicated checkout and local database prepared with `pnpm dev`, plus the account and gateway setup in `docs/deployment.md`. Record the exact environment and AI usage. A missing precondition is blocked coverage, not a passing test. Preserve the mapped journey when reporting the blocker.

## Evidence

Every invocation prints `.verification/run-<id>/`. It contains `server.log`, `browser.log`, `result.json`, `journey.json` and numbered DOM snapshots. The journey records action names, timestamps and outcomes. A failed action remains `started` and gets error evidence when the browser is still accessible. Exit 0 requires setup, every smoke assertion and workspace cleanup to succeed. A four-minute watchdog bounds the run.

Use `pnpm e2e --screenshots` to require a PNG after every step. Screenshot failure then fails the run. Default DOM evidence proves interaction results, not visual correctness.

Capture the action and the resulting state. For persisted Chat or attachment changes, reload and verify saved turns or download bytes as well as the screen. Use real user controls. Keep mocks at an existing external boundary and label mocked coverage explicitly. The shipped smoke uses no mocks. Include the evidence path, covered feature names, pass/fail/block status and remaining gaps in the handoff. Read the screenshot when claiming visual correctness.

## Cleanup

The runner terminates only process groups it started and removes its temporary workspace on success or failure. Evidence remains under `.verification/`, outside that workspace. SIGINT and SIGTERM trigger cleanup. An uncatchable kill can leave resources behind. Identify them from the run's recorded paths and PID before removing anything. Never kill by executable name or reset the developer's database.

The driver closes its browser on success and failure. Inspect retained logs, snapshots and requested screenshots after a failure. Verify the evidence files still exist after cleanup.

## Helpers and maintenance

- `node scripts/e2e.js --help` lists supported commands. `e2e.js` owns launch, doctor and server cleanup. `e2e-browser.js` runs the browser journeys in a child Node process.
- `pnpm verify` remains the repository's full code gate. Browser E2E is an explicit additional check because Chromium must be installed first.
- Update the relevant feature map and executable journey when routes, labels or behavior change. Keep new automated checks in the existing driver until another independently runnable suite is needed.

Adapted from Cursor's [create-verification-skill](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md). Its `/maintain-verification-skill` is an optional upstream workflow, not a command installed in this repository.
