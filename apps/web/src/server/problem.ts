/**
 * API error contract for `/api/*` server routes: RFC 9457 Problem Details. See docs/api.md.
 *
 * `type` is omitted, which RFC 9457 §4.2.1 reads as `about:blank`: the HTTP status carries the
 * meaning and `title` is its reason phrase. `code` is an extension member and the field clients
 * branch on. `instance` is `urn:cf-ray:<ray id>`, the id Workers Logs records for the request.
 */

const problems = {
  VALIDATION_ERROR: { status: 400, title: "Bad Request" },
  UNAUTHORIZED: { status: 401, title: "Unauthorized" },
  NOT_FOUND: { status: 404, title: "Not Found" },
  PAYLOAD_TOO_LARGE: { status: 413, title: "Content Too Large" },
  UNSUPPORTED_MEDIA_TYPE: { status: 415, title: "Unsupported Media Type" },
  TOO_MANY_REQUESTS: { status: 429, title: "Too Many Requests" },
  INTERNAL_SERVER_ERROR: { status: 500, title: "Internal Server Error" },
  SERVICE_UNAVAILABLE: { status: 503, title: "Service Unavailable" },
} as const

type ErrorCode = keyof typeof problems

/** The response every `/api/*` route returns on failure. */
export function problemResponse(
  request: Request,
  code: ErrorCode,
  detail: string,
  init: { headers?: HeadersInit; extensions?: Record<string, unknown> } = {}
): Response {
  const { status, title } = problems[code]
  const rayId = request.headers.get("cf-ray")
  const body = {
    title,
    status,
    detail,
    code,
    ...(rayId && { instance: `urn:cf-ray:${rayId}` }),
    ...init.extensions,
  }
  const headers = new Headers(init.headers)
  headers.set("content-type", "application/problem+json")
  return new Response(JSON.stringify(body), { status, headers })
}
