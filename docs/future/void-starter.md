# Spec: Sweet Kit → Void Starter

Status: items 1 to 10 are done on branch `void-starter`. Delete this file once item 11 is done.

## Goal

A public, MIT-licensed starter. Someone clones it, runs three commands, and has a chat app on their own Cloudflare account: D1 for messages, R2 for files, and Workers AI through AI Gateway.

```sh
pnpm dlx giget gh:SweetRetry/void-starter my-app
cd my-app && pnpm install
pnpm dev      # zero config: local D1 and R2
pnpm run deploy   # void deploy: D1, R2, AI binding, migrations
```

## Done

1. Rename to Void Starter; MIT license; README disclaimer.
2. Legacy removed: the Node server, Postgres, the OTel packages, Next.js, Biome, ADRs and research.
3. TanStack Start app on Void with the Vite+ toolchain, Turborepo and lefthook.
4. Auth and notes removed. The reference feature is a chat app on the Motif chat block, with no accounts.
5. Chats and turns in D1, loaded through a server function.
6. R2 attachments with size limits, `toMarkdown` text for the model, and sandboxed downloads.
7. Streaming answers and reasoning from free Workers AI models through AI Gateway, saved when the stream finishes.
8. A flat `{ code, message }` error contract on `/api/*`; Workers Logs and Traces turned on in `void.config.ts`.
9. Retry design: tokens, DESIGN.md, Base UI components with Retry deltas.
10. Docs in English: README, AGENTS.md, CONTEXT.md, docs/, rules/, scripts.

## 11. Ship

- [x] The user runs `! pnpm connect` (Cloudflare login).
- [ ] First `pnpm run deploy` (confirm with the user first).
- [ ] Deployed browser check: send a message, attach a file, regenerate, reload.
- [x] AI Gateway: it must exist first (error 2001). Created `void-starter`; its logs show calls from dev. Docs updated.
- [ ] Confirm through the Cloudflare API that traces are on.
- [x] `void.lock.json` holds the account id; the template ignores it (docs explain).
- [ ] Ask before creating the public GitHub repo `SweetRetry/void-starter` and pushing.
- [ ] The user renames the local directory to `void-starter` last.
