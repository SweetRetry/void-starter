# Shipping a chat app on Cloudflare with Void

Void turned D1, R2 and Workers AI into three imports and one deploy command. The app is a chat on TanStack Start, one Cloudflare Worker: messages in D1, files in R2, answers from free Workers AI models through AI Gateway. The platform part mostly disappeared. My time went to the seams between Void, the framework, the models and the tooling around them, and this post is a list of those seams.

Try it in the [playground](/chat). There are no accounts: a cookie with a random id keeps your chats in this browser, and nobody else can open them. Attach a PDF, an image or a text file, and the model reads it as Markdown.

## What Void does

Void reads your imports and provisions what they need. Import `void/db` and the deploy creates a D1 database. Import `void/storage` and it creates an R2 bucket. Import `void/ai` and it binds Workers AI. Migrations under `db/migrations` are applied on deploy, and the Worker is published to your own account.

| Import         | Cloudflare product | Used here for                                   |
| :------------- | :----------------- | :---------------------------------------------- |
| `void/db`      | D1                 | Chats, turns, reasoning and the text of files   |
| `void/storage` | R2                 | The uploaded files themselves                   |
| `void/ai`      | Workers AI         | Answers, and `toMarkdown()` for PDFs and images |

In framework mode it is one Vite plugin, and the order matters: `voidPlugin()` wraps Cloudflare's Vite plugin and must come before the framework.

```ts
export default defineConfig({
  plugins: [voidPlugin(), tanstackStart(), react(), tailwindcss()],
})
```

## Where it got sharp

### Workers AI has no local simulator

D1 and R2 run locally. Workers AI doesn't. Until the clone is connected with `void connect --platform cloudflare`, every call fails with `ai: Not available`, so the app turns that into a `503` that says what to run. Dev calls spend the real account's allowance.

### AI Gateway is set per call

`ai: { gateway }` in `void.config.ts` only applies to provider calls through `ai.provider().fetch()`. Workers AI models need the gateway on every call:

```ts
await ai.stream(model, { messages, max_tokens: 2048 }, { gateway: { id: "void-starter" } })
```

The gateway must also exist first. Workers AI rejects an unknown id with error 2001, "Please configure AI Gateway in the Cloudflare dashboard".

### Models don't agree on a stream

`ai.stream()` hands back each model's own SSE. Llama sends `{"response": "..."}`. Qwen3 and gpt-oss send OpenAI-style `choices[0].delta`, with their thinking in `reasoning_content`. Qwen3 also repeats its text in a `response` field that lags behind the delta, so reading both doubles the answer. QwQ sent some digits as JSON numbers, and a parser that only accepts strings silently turns "51" into "". One parser now reads every shape, and its tests pin each case.

Not every model is open to every account either. `@cf/google/gemma-3-12b-it` answered `403` on mine, so the picker lists only models I tried.

### Migrations run on purpose

The dev server doesn't apply migrations. `void db migrate` does, so `pnpm dev` runs it first. When I rewrote the migration history before the first deploy, local D1 refused to migrate until `void db reset` rebuilt it.

### Auth is yours in framework mode

`void/auth` doesn't run with TanStack Start yet. Better Auth works on D1 with its Drizzle adapter at `transaction: false`, since D1 has no interactive transactions. I wired it, then took it out: a starter people fork should carry what every fork keeps.

### Tools load the app's Vite config

In a monorepo, Vitest projects and knip load `apps/web/vite.config.ts` from the workspace root, and `voidPlugin()` then scaffolds `.void/` at the root. The app now has its own `vitest.config.ts` without the plugin, and knip skips the Vite config.

### `pnpm deploy` is taken

pnpm has its own `deploy` command, so a script named `deploy` only runs through `pnpm run deploy`. The error is `ERR_PNPM_CANNOT_DEPLOY_MANY`, which says nothing about scripts.

### The first deploy left workers.dev off

The first deploy went live, but its `workers.dev` route answered Cloudflare error 1042, and the next deploys failed Void's readiness check because the new version had no preview URL. `workers_dev: true` in the `cloudflare` block, plus turning on workers.dev and Preview URLs once in the dashboard, gets out of that loop.

## Numbers

Measured in dev on one account, through the gateway:

| Request                                | Model         |   Time |
| :------------------------------------- | :------------ | -----: |
| One-sentence answer                    | Llama 3.3 70B |  5.1 s |
| Two files, with reasoning              | Qwen3 30B     | 26.3 s |
| Note summary, 109 in and 42 out tokens | Llama 3.3 70B |  1.7 s |

The Qwen3 answer spent 25 s thinking before its first word.

## Run it

```sh
pnpm dlx giget gh:SweetRetry/void-starter my-app
cd my-app
git init
pnpm install
pnpm dev
```

Answers need `pnpm connect` once and an AI Gateway named `void-starter`. `pnpm run deploy` ships the rest.
