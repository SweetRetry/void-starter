# Void Starter

Project vocabulary. Use these terms in requirements, designs and code names.

- **Note.** A user's titled text, stored in D1. Every note belongs to exactly one user.
- **Attachment.** The single file a note may hold, stored in R2 under `users/<userId>/<noteId>/<uuid>`. Replacing it deletes the old object.
- **Summary.** An AI-written digest of a note's body, streamed from Workers AI through AI Gateway and saved when the stream finishes. _Avoid_: "completion".
- **Viewer.** The signed-in user as the root route sees them (`id`, `name`, `email`), or nobody.
- **Problem.** An RFC 9457 error body from an `/api/*` route. `code` is the field clients branch on. See `docs/api.md`.
- **Slice.** A deletable unit of the reference feature that exercises one Cloudflare product (D1 notes, R2 attachments, AI summaries).
- **Connect.** Linking a clone to a Cloudflare account with `pnpm connect`. Workers AI in dev and every deploy need it.
- **Retry.** The design language this starter ships: `DESIGN.md` is its spec, `packages/ui/src/styles/retry.css` its tokens.
- **Retry deltas.** The class changes `scripts/apply-retry-deltas.js` makes to freshly generated shadcn/ui components.
- **F1 freeze.** The byte-level baseline for `packages/ui/src/components`, checked by `pnpm ui:freeze`. A change to it is either an **upstream upgrade** or a **recorded unfreeze**.
