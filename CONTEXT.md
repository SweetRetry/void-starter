# Void Starter

Project vocabulary. Use these terms in requirements, designs and code names.

- **Chat.** One conversation, stored in D1 and addressed by a random UUID in its URL (`/c/<id>`). It belongs to the visitor who sent its first turn. _Alias_: session, in the sidebar.
- **Visitor.** One browser, identified by a random UUID in the HttpOnly `visitor` cookie. It stands in for an account: no sign-in, no fingerprinting, and clearing cookies starts a new visitor. _Avoid_: user, account.
- **Turn.** One message in a chat, from the user or the assistant. _Avoid_: "message" in UI copy; the table is still `message`.
- **Answer.** The assistant turn streamed from Workers AI through AI Gateway and saved when the stream finishes. _Avoid_: "completion".
- **Reasoning.** The thinking a reasoning model streams before its answer (`reasoning_content`), saved beside the answer and shown in the thinking block.
- **Attachment.** A file on a user turn. The bytes live in R2 under `chats/<chatId>/<id>`; the text the model reads is saved in D1.
- **Problem.** An RFC 9457 error body from an `/api/*` route. `code` is the field clients branch on. See `docs/api.md`.
- **Connect.** Linking a clone to a Cloudflare account with `pnpm connect`. Workers AI in dev and every deploy need it.
- **Motif.** The registry the chat UI was copied from (`motif.sweetretry.com`). The copies under `apps/web/src/components` are now local code: maintained, trimmed and linted here, with no sync back to Motif.
- **Retry.** The design language this starter ships: `DESIGN.md` is its spec, `packages/ui/src/styles/retry.css` its tokens.
- **Retry deltas.** The class changes that adapt upstream shadcn/ui components to Retry (`DESIGN.md` › Components).
