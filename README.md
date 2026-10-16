# Void Starter

A full-stack TypeScript starter that deploys to your own Cloudflare account with [Void](https://github.com/voidzero-dev/void). One Worker serves a chat app: messages in D1, files in R2, and answers streamed from Workers AI through AI Gateway.

> Void Starter is an independent project. It is not an official Void or Cloudflare template.

## What you get

- **App.** TanStack Start (React 19, SSR, server functions, file routes) running in Void's framework mode.
- **Data.** D1 through Drizzle, with migrations Void applies on deploy.
- **Files.** R2 through `void/storage`, read for the model with `ai.toMarkdown()`.
- **AI.** Workers AI models on Cloudflare's free daily allowance, so no provider key. Every call goes through AI Gateway, and reasoning models stream their thinking.
- **UI.** Tailwind CSS v4, shadcn/ui on Base UI, the Retry design language ([DESIGN.md](DESIGN.md)), and the chat block from [Motif](https://motif.sweetretry.com).
- **Errors.** RFC 9457 problem+json on every `/api/*` route ([docs/api.md](docs/api.md)).
- **Gates.** Vite+ (format, lint, test), typecheck, knip and project rules behind one command, `pnpm verify`.

There are no accounts. A cookie gives each browser a random visitor id, and the sidebar lists that visitor's chats; other browsers get a 404. Add auth before you put anything private in it.

## Quick start

```sh
pnpm dlx giget gh:SweetRetry/void-starter my-app
cd my-app
git init
pnpm install
pnpm dev
```

`pnpm dev` applies migrations to local D1 and serves <http://localhost:5173> with local D1 and R2.

Workers AI has no local simulator. To get answers in dev, connect the clone to Cloudflare once, create an AI Gateway named `void-starter` in the Cloudflare dashboard (AI › AI Gateway), and restart `pnpm dev`:

```sh
pnpm connect
```

## Deploy

```sh
pnpm connect   # once per clone: Cloudflare login
# once per account: create the AI Gateway "void-starter" in the dashboard
pnpm run deploy
```

`void deploy` builds the app, provisions D1, R2 and the AI binding, applies migrations and publishes the Worker. See [docs/deployment.md](docs/deployment.md) for AI Gateway, models, limits and rollback.

## Layout

```text
apps/web/            TanStack Start app deployed by Void
packages/ui/         shadcn/ui components (byte-frozen) and Retry tokens
packages/typescript-config/
docs/                architecture, API, deployment, observability
rules/               engineering rules with their gates
scripts/             UI freeze and guardrails
```

## Checks

```sh
pnpm verify
```

`pnpm verify` is the full gate, and CI runs the same command. Git hooks from [lefthook.yml](lefthook.yml) run a fast subset on commit and push.

## Docs

- [docs/architecture.md](docs/architecture.md) explains the stack and why each choice was made.
- [docs/api.md](docs/api.md) defines the error contract and every problem type.
- [docs/deployment.md](docs/deployment.md) covers AI Gateway, models, usage limits and rollback.
- [docs/observability.md](docs/observability.md) covers logs and traces, locally and in production.
- [AGENTS.md](AGENTS.md) is the entry point for coding agents.

## License

[MIT](LICENSE)
