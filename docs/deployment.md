# Deployment

Void deploys the app to your own Cloudflare account as one Worker. Every command below runs from the repo root.

## First deploy

Pick the Worker name first: `cloudflare.name` in `apps/web/void.config.ts` (default `void-starter`). It also names the `workers.dev` subdomain.

```sh
pnpm connect
pnpm --filter web exec void secret put BETTER_AUTH_SECRET
pnpm deploy
```

Before the first summary, create the AI Gateway: Cloudflare dashboard › AI › AI Gateway › Create gateway, named `void-starter` (or the value of `AI_GATEWAY_ID`). Workers AI rejects a gateway id the account doesn't have, and the summary route answers `503` saying so. One gateway serves both dev and production.

1. `pnpm connect` runs `void connect --platform cloudflare`. It signs you in to Cloudflare in the browser and records the choice in `apps/web/.void/project.json`. That file is gitignored, so each clone connects once.
2. `void secret put` stores the secret on the Worker. Generate a value with `openssl rand -base64 32`. Production never reads `.env`.
3. `pnpm deploy` runs `void deploy`. It builds the app, creates the D1 database and R2 bucket on the first run, binds Workers AI, applies pending D1 migrations and publishes the Worker. It prints the `workers.dev` URL when it's done.

`void deploy` writes `apps/web/void.lock.json` with your account id and the resources it created. The starter repo ignores it so no fork inherits someone else's account. In your own app, delete the `apps/web/void.lock.json` line from `.gitignore` and commit the file, so later deploys and teammates reuse the same database and bucket.

## Secrets and env

`apps/web/env.ts` declares every server value. Locally they come from `apps/web/.env`, which `pnpm dev` creates on first run. In production each one is a Worker secret:

| Name                        | Required | Purpose                                 |
| :-------------------------- | :------- | :-------------------------------------- |
| `BETTER_AUTH_SECRET`        | yes      | Signs sessions. At least 32 characters. |
| `AUTH_GITHUB_CLIENT_ID`     | no       | GitHub sign-in, with the secret below   |
| `AUTH_GITHUB_CLIENT_SECRET` | no       |                                         |
| `AUTH_GOOGLE_CLIENT_ID`     | no       | Google sign-in, with the secret below   |
| `AUTH_GOOGLE_CLIENT_SECRET` | no       |                                         |

`pnpm --filter web exec void secret list` shows what's set. `void secret sync <file>` uploads a whole dotenv file.

## OAuth providers

A provider's button appears only when both its client id and secret are set.

- **GitHub.** Create an OAuth app under Settings › Developer settings. Set the callback URL to `https://<your-domain>/api/auth/callback/github`.
- **Google.** Create an OAuth client (type: web application) in Google Cloud Console. Add `https://<your-domain>/api/auth/callback/google` as an authorized redirect URI.

For local sign-in, register a second app with `http://localhost:5173` as the base and put its credentials in `apps/web/.env`.

## AI Gateway

Workers AI calls name the gateway on every request (`AI_GATEWAY_ID` in `apps/web/src/server/ai.ts`, default `void-starter`). The gateway must exist first; see [First deploy](#first-deploy). Its logs, analytics, caching and rate limits live under AI › AI Gateway in the dashboard. `ai: { gateway }` in `void.config.ts` uses the same id for provider calls.

To change the model, edit `SUMMARY_MODEL` in the same file.

### Provider models

`ai.provider(name).fetch(path, init)` calls a provider's native API (OpenAI, Google AI Studio, or a custom provider) through the same gateway, with your own key. Store the key as a secret and declare it in `env.ts`:

```sh
pnpm --filter web exec void secret put OPENAI_API_KEY
```

```ts
import { ai } from "void/ai"

const response = await ai.provider("openai").fetch("/chat/completions", {
  body: { model: "gpt-4o", messages: [{ role: "user", content: prompt }] },
})
```

## Analytics

Nothing is tracked by default. For page views, turn on [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/) for the Worker's domain. It sets no cookies, so it needs no consent banner.

## Logs and rollback

```sh
pnpm --filter web exec void project logs       # tail the deployed Worker's logs
pnpm --filter web exec void project rollback   # return to an earlier version
```

Rollback restores code, not data. D1 migrations stay applied, so keep each migration compatible with the code before it. See [observability.md](observability.md) for traces.

## CI

`.github/workflows/ci.yml` runs `pnpm verify` on every push and pull request. Deploying from CI needs a Cloudflare API token; it isn't set up here.
