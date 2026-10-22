# API

The app has two kinds of server endpoints:

- **Server functions** (`createServerFn`) back the app's own pages. They are TanStack Start RPCs, not a public API. Their errors travel through TanStack's channel: `notFound()`, `redirect()`, or a thrown error the page catches.
- **`/api/*` server routes** carry what isn't a page RPC: uploads, downloads and streams. Every error they return follows the contract below.

## Routes

| Method | Path                               | Success                                                           |
| :----- | :--------------------------------- | :---------------------------------------------------------------- |
| `POST` | `/api/chats/:chatId/messages`      | `200` with a `text/event-stream` of the answer                    |
| `POST` | `/api/chats/:chatId/answer`        | `200` with a `text/event-stream` of a new answer                  |
| `GET`  | `/api/chats/:chatId/files/:fileId` | `200` with the file; images inline, everything else as a download |

`messages` takes multipart form data: `content`, `model` (one of the ids in `src/lib/models.ts`) and up to four `files` of at most 5 MB each. The first message creates the chat. Files go to R2 under `chats/<chatId>/<fileId>`; their text (read directly, or through `ai.toMarkdown()` for PDFs, images and Office files) is saved in D1 and sent to the model inside `<file>` tags.

`answer` takes `{ "model": "..." }`, removes the answers after the latest user turn and streams a new one.

Both streams are Workers AI's SSE. Older models send `data: {"response": "..."}`; newer ones send OpenAI-style `choices[0].delta` with `content` and, for reasoning models, `reasoning_content`. A stream that stops early ends with `event: void:limit` or `event: void:error`. The server saves the answer, with its reasoning, once the stream finishes cleanly. `src/lib/ai-stream.ts` parses both shapes for the browser and the server.

Files are served with `x-content-type-options: nosniff` and `content-security-policy: sandbox`, so an uploaded HTML or SVG file never runs on the app's origin.

There are no accounts. The first page load sets a `visitor` cookie (a random UUID, HttpOnly, one year), and the first message ties the chat to it. Every route answers `404` for a chat owned by another visitor, the same as for a missing one, and `401` when the cookie is absent.

## Error contract

Every `/api/*` error is a 4xx or 5xx response with `content-type: application/json` and a flat body:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Files can be up to 5 MB each.",
  "issues": [{ "path": "files.0", "message": "Files can be up to 5 MB each." }]
}
```

- `code` and the status are what a client branches on. Each code maps to exactly one status.
- `message` is a sentence for the person using the app. Clients show it and never parse it.
- `issues` comes only with `VALIDATION_ERROR`: one `{ path, message }` per failed field, `path` dotted (`files.0`) and `""` for the whole input. `message` repeats the first issue.
- `traceId` comes only with `INTERNAL_SERVER_ERROR`. It is the request's `cf-ray` id through Cloudflare's edge, or a random UUID locally, and the `api.failed` log carries the same value ([observability.md](observability.md)).
- A body never holds stack traces, SQL, internal hostnames or the validation library's own wording. Headers such as `retry-after` carry anything else.

| `code`                  | Status | When                                                                                     |
| :---------------------- | :----- | :--------------------------------------------------------------------------------------- |
| `VALIDATION_ERROR`      | 400    | The input doesn't match the schema, a file is over 5 MB or empty, or the body is too big |
| `UNAUTHORIZED`          | 401    | Credentials are missing, invalid or expired: today, no `visitor` cookie                  |
| `FORBIDDEN`             | 403    | The resource is visible, but this identity may not do that. Unused today                 |
| `NOT_FOUND`             | 404    | The chat or file doesn't exist, the id is malformed, or another visitor owns the chat    |
| `CONFLICT`              | 409    | The request conflicts with the resource's current state. Unused today                    |
| `TOO_MANY_REQUESTS`     | 429    | A usage limit was reached; wait for `retry-after` seconds                                |
| `INTERNAL_SERVER_ERROR` | 500    | An unexpected failure; `traceId` finds it in the logs                                    |
| `SERVICE_UNAVAILABLE`   | 503    | A dependency isn't configured or reachable, such as AI before `pnpm connect`             |

### Rules

1. Build every error with `errorResponse()` from `apps/web/src/server/error-response.ts`, and every validation failure with `validationError()` from `src/lib/api.ts`. Never write error JSON by hand.
2. Wrap every `/api/chats/$chatId/*` handler in `chatRoute()` (`src/server/api.server.ts`). It answers `404` for a malformed id and `401` without a visitor, and an unexpected throw still answers `500` with a `traceId` and is logged as `api.failed`.
3. The browser reads an error body only through `readApiError()` in `src/lib/api.ts`.
4. Success bodies carry the result directly. There is no `{ success, data }` envelope.
5. Answer `404`, not `403`, when the caller may not know the resource exists.
6. Add a code only when a client must react differently and the status alone can't tell it. Renaming or removing a published code is a breaking change.

`apps/web/test/api.test.ts` asserts the status and body of each error through the route handlers.
