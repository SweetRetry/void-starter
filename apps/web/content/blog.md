# Void Starter

`void-starter` is a full-stack TypeScript starter on Void and TanStack Start. It deploys as a single Cloudflare Worker and ships a working AI chat application backed by D1, R2 and Workers AI through AI Gateway.

Alongside the app, the repository includes Tailwind CSS v4, shadcn/ui on Base UI, the Retry design system, Motif chat components, Oxlint (`@shadcn/lint`), Knip, `markdownlint-cli2` and Lefthook. Open the [playground](/chat) to try the chat app, or clone the repository to run it locally.

## Stack

- **Runtime**: TanStack Start on Void in framework mode, deployed as one Cloudflare Worker.
- **Database**: Cloudflare D1 with Drizzle ORM and SQL migrations in `apps/web/db/migrations`.
- **Storage**: Cloudflare R2 for chat attachments, converted to Markdown via `ai.toMarkdown()`.
- **AI**: Free `@cf/*` Workers AI models streamed through Cloudflare AI Gateway, including reasoning models.
- **Session**: An HttpOnly `visitor` cookie with a random UUID per browser.
- **UI**: Tailwind CSS v4, Base UI shadcn components, Retry tokens and Motif chat blocks.
- **Tooling**: Vite+ (`vp fmt`, `vp lint`, `vp test`), `@shadcn/lint`, Knip, `markdownlint-cli2` and Lefthook behind `pnpm verify`.

## Workspace layout

`void-starter` is a Turborepo + pnpm monorepo with one web app and two shared internal packages:

```text
void-starter/
  apps/web/                     TanStack Start app, Drizzle schema, Void config
  packages/ui/                  shadcn/ui (Base UI) + Retry tokens
  packages/typescript-config/   Shared TypeScript presets
  rules/                        Zod v4 static check
  scripts/                      Skill sync and E2E runner
  docs/                         Architecture, API contract, deploy and logs
```

`apps/web` holds the routes, server functions and API endpoints. `packages/ui` exports the shared component primitives and theme tokens.

## Chat app architecture

Void provisions Cloudflare bindings directly from module imports in `apps/web`:

| Import         | Cloudflare binding | Role in `void-starter`                             |
| :------------- | :----------------- | :------------------------------------------------- |
| `void/db`      | D1                 | Chats, turns, model reasoning and parsed file text |
| `void/storage` | R2                 | Uploaded attachment bytes under `chats/<id>/<id>`  |
| `void/ai`      | Workers AI         | Streamed answers, thinking and `ai.toMarkdown()`   |

In `apps/web/vite.config.ts`, `voidPlugin()` runs first ahead of `tanstackStart()`:

```ts
export default defineConfig({
  plugins: [voidPlugin(), tanstackStart(), react(), tailwindcss()],
})
```

### D1 and Drizzle

`apps/web/db/schema.ts` defines three tables: `chat`, `message` and `attachment`. Opening `/c/:chatId` runs a TanStack Start server function (`createServerFn`) that loads the visitor's sidebar sessions and the chat's saved turns from D1. `*.server.ts` modules stay on the server bundle.

### R2 attachments

`POST /api/chats/:chatId/messages` accepts multipart uploads, writes raw file bytes to R2 under `chats/<chatId>/<attachmentId>`, extracts Markdown with `ai.toMarkdown()`, and saves the extracted text on the `attachment` row in D1.

### Workers AI stream

`POST /api/chats/:chatId/answer` streams tokens from `@cf/*` models through AI Gateway. Reasoning models stream `reasoning_content` ahead of the answer text; the Worker forwards both streams to the browser and writes the completed turn to D1.

### RFC 9457 errors

Every `/api/*` error returns `application/problem+json` with a machine-readable `code` field and the Cloudflare `cf-ray` request ID in `instance`.

## Cloudflare details

### Remote AI in dev

D1 and R2 run locally in Miniflare. Workers AI runs on Cloudflare's network and requires `pnpm connect` (`void connect --platform cloudflare`). Before connecting, model calls return a `503` Problem naming the command to run.

### AI Gateway

Direct Workers AI calls pass the gateway ID on each request:

```ts
await ai.stream(model, { messages, max_tokens: 2048 }, { gateway: { id: "void-starter" } })
```

The `void-starter` gateway must exist in the Cloudflare dashboard before calling a model; otherwise Workers AI returns error `2001`.

### Stream parser

Workers AI models return different SSE formats: Llama sends `{"response": "..."}`, Qwen3 and `gpt-oss` send OpenAI-style `choices[0].delta` chunks (with Qwen3 also repeating lagging text in `response`), and QwQ emits numeric tokens as JSON numbers. `apps/web/src/lib/ai-stream.ts` normalizes all formats into `{ type: "reasoning" | "text", text }`.

### Deploy and latency

Deployment runs through `pnpm run deploy` (`pnpm deploy` is reserved by pnpm). `apps/web/void.config.ts` sets `workers_dev: true` for preview readiness checks.

Measured response times in dev through AI Gateway:

| Scenario                        | Model         |   Time |
| :------------------------------ | :------------ | -----: |
| Single-sentence answer          | Llama 3.3 70B |  5.1 s |
| Two attachments with reasoning  | Qwen3 30B     | 26.3 s |
| Short summary (109 in / 42 out) | Llama 3.3 70B |  1.7 s |

## Quick start

```sh
pnpm dlx giget gh:SweetRetry/void-starter my-app
cd my-app
git init
pnpm install
pnpm dev
```

Run `pnpm connect` once and create the `void-starter` AI Gateway in the Cloudflare dashboard to enable model responses. Run `pnpm run deploy` to deploy the Worker, migrations and bindings.
