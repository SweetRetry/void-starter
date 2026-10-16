# API

The app has two kinds of server endpoints:

- **Server functions** (`createServerFn`) back the app's own pages. They are TanStack Start RPCs, not a public API. Their errors travel through TanStack's channel: `notFound()`, `redirect()`, or a thrown error the page catches.
- **`/api/*` server routes** carry what isn't a page RPC: uploads, downloads and streams. Every error they return follows the contract below. `/api/auth/*` belongs to Better Auth and keeps its own protocol.

## Routes

| Method   | Path                            | Success                                         |
| :------- | :------------------------------ | :---------------------------------------------- |
| `GET`    | `/api/notes/:noteId/attachment` | `200` with the file, sent as a download         |
| `PUT`    | `/api/notes/:noteId/attachment` | `200` with `{ name, type, size }`               |
| `DELETE` | `/api/notes/:noteId/attachment` | `204`                                           |
| `POST`   | `/api/notes/:noteId/summary`    | `200` with a `text/event-stream` of the summary |

`PUT` takes the raw file as the body, its type in `content-type` and its name in `x-file-name`. Files are limited to 10 MB and to images (PNG, JPEG, WebP, GIF), PDF, plain text and Markdown. Downloads carry `x-content-type-options: nosniff` and `content-disposition: attachment`, so an uploaded HTML or SVG file never runs on the app's origin.

The summary stream is Workers AI's SSE (`data: {"response": "..."}` chunks, then `data: [DONE]`). A stream that stops early ends with `event: void:limit` or `event: void:error`. The server saves the summary to the note once the stream finishes cleanly. `src/lib/ai-stream.ts` parses the stream for the browser.

## Error contract

Every `/api/*` error is an [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) problem with the media type `application/problem+json`:

```json
{
  "title": "Not Found",
  "status": 404,
  "detail": "Note not found.",
  "code": "NOT_FOUND",
  "instance": "urn:cf-ray:8c1f2a3b4d5e6f70-SJC"
}
```

- `type` is omitted, which RFC 9457 reads as `about:blank`: the HTTP status carries the meaning and `title` is its reason phrase.
- `code` is the field a client branches on. Each code maps to exactly one status.
- `detail` is a sentence for the person using the app. It never holds stack traces, SQL or raw validation output.
- `instance` is `urn:cf-ray:<ray id>` on requests through Cloudflare's edge. Workers Logs records the same id, so an error report leads to the request ([observability.md](observability.md)).
- Extension members, such as `retryAt` on a 429, may be added. Clients ignore members they don't know.

| `code`                   | Status | When                                                                         |
| :----------------------- | :----- | :--------------------------------------------------------------------------- |
| `VALIDATION_ERROR`       | 400    | The input doesn't match the schema                                           |
| `UNAUTHORIZED`           | 401    | No valid session                                                             |
| `NOT_FOUND`              | 404    | The resource doesn't exist, or it belongs to someone else                    |
| `PAYLOAD_TOO_LARGE`      | 413    | The upload is over 10 MB                                                     |
| `UNSUPPORTED_MEDIA_TYPE` | 415    | The upload's type isn't on the allowlist                                     |
| `TOO_MANY_REQUESTS`      | 429    | A usage limit was reached; wait for `retry-after` seconds                    |
| `INTERNAL_SERVER_ERROR`  | 500    | An unexpected failure; the ray id finds it in the logs                       |
| `SERVICE_UNAVAILABLE`    | 503    | A dependency isn't configured or reachable, such as AI before `pnpm connect` |

### Rules

1. Build every error with `problemResponse()` from `apps/web/src/server/problem.ts`. Never write error JSON by hand.
2. Wrap every `/api/*` handler in `withProblems()` (`src/server/api.server.ts`), so an unexpected throw still answers as problem+json and is logged as `api.failed`.
3. A signed-out caller gets `401`, even for a note that doesn't exist.
4. Someone else's note answers `404`, not `403`. A `403` would confirm that the note exists.
5. Success bodies carry the result directly. There is no `{ success, data }` envelope.
6. Add a code only when a client must react differently and the status alone can't tell it. A published code never changes meaning.

`apps/web/test/problem.test.ts` covers the response shape.
