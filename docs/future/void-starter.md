# Spec: Sweet Kit → Void Starter

Status: items 1 to 10 are done on branch `void-starter`. Delete this file once item 11 is done.

## Goal

A public, MIT-licensed starter. Someone clones it, runs three commands, and has a full-stack app on their own Cloudflare account with auth, a D1 database, R2 uploads and AI through AI Gateway.

```sh
pnpm dlx giget gh:SweetRetry/void-starter my-app
cd my-app && pnpm install
pnpm dev      # zero config: email/password auth, local D1 and R2
pnpm deploy   # void deploy: D1, R2, AI binding, migrations
```

## Done

1. Rename to Void Starter; MIT license; README disclaimer.
2. Legacy removed: the Node server, Postgres, the OTel packages, Next.js, Biome, ADRs and research.
3. TanStack Start app on Void with the Vite+ toolchain, Turborepo and lefthook.
4. Better Auth on D1, with GitHub and Google behind their credentials.
5. Notes CRUD through server functions, scoped by user.
6. R2 attachments with size and type limits and safe download headers.
7. Streaming AI summaries through AI Gateway, saved when the stream finishes.
8. RFC 9457 contract on `/api/*`; Workers Logs and Traces turned on in `void.config.ts`.
9. Retry design: tokens, DESIGN.md, Base UI components with Retry deltas.
10. Docs in English: README, AGENTS.md, CONTEXT.md, docs/, rules/, scripts.

## 11. Ship

- [ ] The user runs `! pnpm connect` (Cloudflare login).
- [ ] `void secret put BETTER_AUTH_SECRET`, then the first `pnpm deploy` (confirm with the user first).
- [ ] Deployed browser check: sign up, create a note, upload, summarize.
- [ ] Confirm AI Gateway logs show the summary calls, and whether the gateway had to exist first. Update docs/deployment.md.
- [ ] Confirm through the Cloudflare API that traces are on.
- [ ] Commit `apps/web/void.lock.json`.
- [ ] Ask before creating the public GitHub repo `SweetRetry/void-starter` and pushing.
- [ ] The user renames the local directory to `void-starter` last.
