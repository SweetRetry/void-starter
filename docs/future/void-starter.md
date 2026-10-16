# Spec: Sweet Kit → Void Starter

Status: in progress on branch `void-starter`. Delete this file once every item below is done and the content lives in `docs/`.

## Goal

A public, MIT-licensed starter. Someone clones it, runs three commands, and has a full-stack app on their own Cloudflare account with auth, a D1 database, R2 uploads, and AI through AI Gateway. The UI uses Tailwind CSS v4, shadcn/ui, and the Retry design language. An agent can keep building on it because the repo ships its own rules and gates.

Success is measured by one path:

```sh
pnpm dlx giget gh:SweetRetry/void-starter my-app
cd my-app && pnpm install
pnpm dev      # works with zero config: email/password auth, D1, R2 (local)
pnpm deploy   # void deploy: provisions D1, R2, AI binding, secrets, migrations
```

## Facts this spec rests on

Read from Void v1.1.11 source and docs (`voidzero-dev/void`).

- `void/db` infers D1, `void/storage` infers R2, `void/ai` infers Workers AI. `void deploy` provisions them and applies migrations.
- `void/ai` uses AI Gateway when `ai: { gateway }` is set in `void.config.ts`. Workers AI has no local simulator, so dev calls hit the account.
- The app runs in Void's framework mode with TanStack Start (decided after alignment). Void owns bindings, migrations and deploy; TanStack Start owns routing, SSR, server functions and server routes. `voidPlugin()` must come before `tanstackStart()` in the Vite config.
- `void/auth` does not work in framework mode (`integrations/frameworks/overview.md`). Better Auth is wired by the app on Drizzle + D1, and `BETTER_AUTH_SECRET` is set with `void secret put`.
- `cloudflare` in `void.config.ts` passes Wrangler fields through (`reference/config.md:330`). Deploy code handles `observability.logs` explicitly. Traces are unverified until the first deploy.
- `void init` supports an app inside a pnpm workspace (`cli/init.ts:743`).
- `create-void` takes no third-party template, so distribution is giget plus a GitHub template repo.
- Validation errors from `defineHandler.withValidator` use Void's own 400 shape, not problem+json. Unverified whether it can be overridden.

## Target layout

```
apps/web/                 TanStack Start app deployed by Void
  src/routes/             TanStack file routes (pages + /api server routes)
  src/server/             server-only modules (auth, notes, problem contract)
  src/lib/                client helpers
  db/schema.ts            Drizzle schema (D1, app + Better Auth tables) + db/migrations/
  env.ts                  defineEnv schema
  vite.config.ts          voidPlugin() + tanstackStart() + react() + tailwind
  void.config.ts          ai.gateway, cloudflare.observability
packages/ui/              shadcn/ui components (F1 frozen) + Retry tokens
packages/typescript-config/
docs/                     architecture, api, deployment, observability, design
rules/                    gates (zod-v4, web-design, api-contract)
scripts/                  ui-freeze, ui-guardrails, sync-retry-design
```

## Work items

Each item ends in a commit that passes `pnpm verify`.

### 1. Rename

- [ ] Root package `sweet-kit` → `void-starter`. "Sweet Kit" → "Void Starter" in every file.
- [ ] `sweet-kit.dev` problem type prefix → derive from the app origin or a neutral `https://void-starter.dev/problems/`. Decide in item 8.
- [ ] LICENSE (MIT, SweetRetry).
- [ ] README line: an independent starter, not an official Void template.

### 2. Delete legacy

- [ ] `apps/server` (Hono on Node, Postgres, Pino, OTel SDK, Scalar, OpenAPI, rate limiter).
- [ ] `packages/tracing`, `packages/observability`, `packages/logger`, `packages/request` (contract moves into `apps/web`).
- [ ] `compose.yaml`, `infra:up/down`, Postgres service in CI.
- [ ] All of `docs/adr/`, `docs/research/`.
- [ ] Biome (`biome.json`, scripts, lefthook job). Vite+ formats and lints.
- [ ] Next.js app files, `next-env.d.ts`, `typescript-config/nextjs.json`, `apps/web/AGENTS.md` Next block.
- [ ] Third-party analytics and consent banner (GA, Meta Pixel, UET). Decision taken without asking: a CF starter points at Cloudflare Web Analytics, which is cookie-free and needs no consent. Documented as an opt-in in `docs/deployment.md`.
### 3. App skeleton

- [ ] `apps/web` with `void`, `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/react-query`, `vite-plus`, React 19, Tailwind v4 via `@tailwindcss/vite`.
- [ ] Forms stay react-hook-form + zod + shadcn Form (tech selection unchanged).
- [ ] Turborepo stays. Tasks: `dev`, `build`, `typecheck`, `test`, `lint`. `void prepare` runs before typecheck.
- [ ] Vite+ (`vp lint`, `vp fmt`, `vp test`) replaces Biome and bare vitest. `.oxlintrc.json` shadcn rules keep running.
- [ ] Root scripts: `dev`, `build`, `verify`, `deploy` (`pnpm --filter web exec void deploy`), `db:generate`.
- [ ] lefthook: pre-commit `vp fmt` + `rules:check`, pre-push typecheck + test.
- [ ] knip config for the new layout.
- [ ] `pnpm dev` serves `/` from a real browser check.

### 4. D1 + auth

- [ ] `db/schema.ts` with the `note` table (id, userId, title, body, attachmentKey, summary, timestamps).
- [ ] Better Auth tables (sqlite) in `db/schema.ts`. `void db generate` migrations checked in.
- [ ] `src/server/auth.ts`: Better Auth on `void/db` with the Drizzle sqlite adapter, email/password always on, GitHub and Google added only when both their env vars exist. Mounted at `/api/auth/$`.
- [ ] Sign-in and sign-up pages. OAuth buttons render only for enabled providers (a server function returns the list).
- [ ] A `requireUser` helper guards every notes server function and route.
- [ ] `BETTER_AUTH_SECRET` declared in `env.ts`. Local default in `.env.example`; production via `void secret put`.
- [ ] Browser check: sign up, sign out, sign in.

### 5. Notes (D1 CRUD)

- [ ] `src/routes/notes/` list + detail with route loaders calling server functions.
- [ ] One Zod 4 schema per input, shared by `createServerFn().inputValidator` and react-hook-form.
- [ ] Scoped by `userId`. Another user's note returns 404.

### 6. R2 attachments

- [ ] Upload route via `void/storage`, key `users/<userId>/<noteId>/<uuid>`.
- [ ] Size and content-type limits. `nosniff` and `Content-Disposition` on download.
- [ ] Download route checks ownership.

### 7. AI Gateway summaries

- [ ] `void.config.ts`: `ai: { gateway: "void-starter" }`. This covers `ai.provider().fetch()` only.
- [ ] Workers AI calls pass `{ gateway: { id: "void-starter" } }` as the third argument, which Void forwards to the binding (`runtime/ai.ts:478`). One constant holds the gateway id.
- [ ] After deploy: confirm requests show up in the gateway's logs and whether the gateway must be created first.
- [ ] Server route `/api/notes/$id/summary` streams with `ai.stream("@cf/meta/llama-3.3-70b-instruct-fp8-fast", ...)`.
- [ ] Client reads the SSE stream, handles `void:limit` and `void:error` events, keeps partial output, offers retry.
- [ ] Summary saved to the note once the stream completes.
- [ ] `docs/deployment.md`: provider models through `ai.provider("openai")` with `void secret put OPENAI_API_KEY`.

### 8. Error contract + observability

- [ ] RFC 9457 contract moves to `apps/web/src/lib/problem.ts`. Tests keep the invariants.
- [ ] Every `/api/*` server route answers errors through one helper that returns problem+json with `instance` carrying `cf-ray`.
- [ ] `UsageLimit` 429 and validation 400 on `/api/*` also leave as problem+json. Server functions surface errors through TanStack's own channel.
- [ ] `void.config.ts` `cloudflare.observability`: logs + traces enabled.
- [ ] After deploy: confirm via the CF API that traces are on.

### 9. Retry design

- [ ] `scripts/sync-retry-design.js` pulls `DESIGN.md` and `globals.css` from a pinned `SweetRetry/retry-design` commit.
- [ ] `packages/ui/src/styles/globals.css` = Retry's file. HITL approved in the alignment session.
- [ ] Inter with `opsz`, `class="dark"` on `<html>`, `MotionConfig` defaults per Retry.
- [ ] Root `DESIGN.md` routes to Retry's visual language and `rules/web-design/*` gates.
- [ ] UI copy follows Retry's voice: English, sentence case, verbs on buttons.

### 10. Docs

- [ ] English everywhere: README, AGENTS.md, CONTEXT.md, docs/, rules/, comments.
- [ ] `docs/architecture.md` absorbs the decision log (why Void, D1, one Worker).
- [ ] `docs/api.md` (old ADR 0005 + api-contract), `docs/deployment.md`, `docs/observability.md`.
- [ ] AGENTS.md routing table without ADRs.
- [ ] README quick start matches the success path above.

### 11. Ship

- [ ] First `void deploy` to the user's Cloudflare account. The user runs `! pnpm --filter web exec void cloudflare login`.
- [ ] Deployed browser check of the full path: sign up, create note, upload, summarize.
- [ ] Ask before creating the public GitHub repo `SweetRetry/void-starter` and pushing.
- [ ] The user renames the local directory to `void-starter` last.

## Out of scope for v1

KV, Queues, Crons, Email, Durable Objects. Documented as extension points, no demo. Void Platform deployment. Deploy-to-Cloudflare button.
