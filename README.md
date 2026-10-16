# Void Starter

A full-stack TypeScript starter that deploys to your own Cloudflare account with [Void](https://github.com/voidzero-dev/void). One Worker serves the app, with auth, a D1 database, R2 uploads and Workers AI through AI Gateway.

> Void Starter is an independent project. It is not an official Void or Cloudflare template.

## What you get

- **App.** TanStack Start (React 19, SSR, server functions, file routes) running in Void's framework mode.
- **Auth.** Better Auth on D1. Email and password work with zero config. GitHub and Google turn on when their credentials exist.
- **Data.** D1 through Drizzle, with migrations Void applies on deploy.
- **Files.** R2 through `void/storage`.
- **AI.** Workers AI through AI Gateway, streamed to the browser.
- **UI.** Tailwind CSS v4, shadcn/ui on Base UI, and the Retry design language ([DESIGN.md](DESIGN.md)).
- **Errors.** RFC 9457 problem+json on every `/api/*` route ([docs/api.md](docs/api.md)).
- **Gates.** Vite+ (format, lint, test), typecheck, knip and project rules behind one command, `pnpm verify`.

A reference feature ties it together: notes with one attachment each and an AI summary. Each Cloudflare product is its own slice, so you can delete what you don't need.

## Quick start

```sh
pnpm dlx giget gh:SweetRetry/void-starter my-app
cd my-app
pnpm install
pnpm dev
```

`pnpm dev` serves <http://localhost:5173> with local D1 and R2. The first run writes `apps/web/.env` with a random `BETTER_AUTH_SECRET`.

Workers AI has no local simulator. To try summaries in dev, connect the clone to Cloudflare once and restart `pnpm dev`:

```sh
pnpm connect
```

## Deploy

```sh
pnpm connect                                        # once per clone: Cloudflare login
pnpm --filter web exec void secret put BETTER_AUTH_SECRET
pnpm deploy
```

`void deploy` builds the app, provisions D1, R2 and the AI binding, applies migrations and publishes the Worker. See [docs/deployment.md](docs/deployment.md) for OAuth providers, AI Gateway, provider models and rollback.

## Layout

```text
apps/web/            TanStack Start app deployed by Void
packages/ui/         shadcn/ui components (byte-frozen) and Retry tokens
packages/typescript-config/
docs/                architecture, API, deployment, observability
rules/               engineering rules with their gates
scripts/             UI freeze, Retry sync and codemod
```

## Checks

```sh
pnpm verify
```

`pnpm verify` is the full gate, and CI runs the same command. Git hooks from [lefthook.yml](lefthook.yml) run a fast subset on commit and push.

## Docs

- [docs/architecture.md](docs/architecture.md) explains the stack and why each choice was made.
- [docs/api.md](docs/api.md) defines the error contract and every problem type.
- [docs/deployment.md](docs/deployment.md) covers secrets, OAuth, AI and rollback.
- [docs/observability.md](docs/observability.md) covers logs and traces, locally and in production.
- [AGENTS.md](AGENTS.md) is the entry point for coding agents.

## License

[MIT](LICENSE)
