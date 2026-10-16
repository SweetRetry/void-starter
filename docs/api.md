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

There are no accounts. A chat id is a random UUID, and whoever holds the link can read the chat and its files.

## Error contract

Every `/api/*` error is an [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) problem with the media type `application/problem+json`:

```json
{
  "title": "Not Found",
  "status": 404,
  "detail": "Chat not found.",
  "code": "NOT_FOUND",
  "instance": "urn:cf-ray:8c1f2a3b4d5e6f70-SJC"
}
```

- `type` is omitted, which RFC 9457 reads as `about:blank`: the HTTP status carries the meaning and `title` is its reason phrase.
- `code` is the field a client branches on. Each code maps to exactly one status.
- `detail` is a sentence for the person using the app. It never holds stack traces, SQL or raw validation output.
- `instance` is `urn:cf-ray:<ray id>` on requests through Cloudflare's edge. Workers Logs records the same id, so an error report leads to the request ([observability.md](observability.md)).
- Extension members, such as `retryAt` on a 429, may be added. Clients ignore members they don't know.

| `code`                  | Status | When                                                                         |
| :---------------------- | :----- | :--------------------------------------------------------------------------- |
| `VALIDATION_ERROR`      | 400    | The input doesn't match the schema                                           |
| `NOT_FOUND`             | 404    | The chat id is malformed, or the file doesn't exist in that chat             |
| `PAYLOAD_TOO_LARGE`     | 413    | A file is over 5 MB, or empty                                                |
| `TOO_MANY_REQUESTS`     | 429    | A usage limit was reached; wait for `retry-after` seconds                    |
| `INTERNAL_SERVER_ERROR` | 500    | An unexpected failure; the ray id finds it in the logs                       |
| `SERVICE_UNAVAILABLE`   | 503    | A dependency isn't configured or reachable, such as AI before `pnpm connect` |

### Rules

1. Build every error with `problemResponse()` from `apps/web/src/server/problem.ts`. Never write error JSON by hand.
2. Wrap every `/api/chats/$chatId/*` handler in `chatRoute()` (`src/server/api.server.ts`). It answers `404` for a malformed id, and an unexpected throw still answers as problem+json and is logged as `api.failed`.
3. Success bodies carry the result directly. There is no `{ success, data }` envelope.
4. Add a code only when a client must react differently and the status alone can't tell it. A published code never changes meaning.

`apps/web/test/problem.test.ts` covers the response shape.
