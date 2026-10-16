/**
 * API error contract: RFC 9457 Problem Details, for every `/api/*` server route.
 *
 * Standard members `type`, `title`, `status`, `detail` and `instance` keep their RFC meaning.
 * `code` is an extension member (RFC 9457 §3.2) and the only field clients should branch on;
 * it maps one-to-one to the last segment of `type`. `instance` is `urn:cf-ray:<ray id>`, so a
 * user's error report finds the exact request in Workers Logs. See docs/api.md.
 */

/** RFC 9457 §3 media type */
export const PROBLEM_MEDIA_TYPE = "application/problem+json"

/** `type` identifies the problem; stable and absolute, never changed once published */
export const PROBLEM_TYPE_PREFIX =
  "https://github.com/SweetRetry/void-starter/blob/main/docs/api.md#"

const problems = {
  VALIDATION_ERROR: { status: 400, title: "Validation Error", slug: "validation-error" },
  UNAUTHORIZED: { status: 401, title: "Unauthorized", slug: "unauthorized" },
  FORBIDDEN: { status: 403, title: "Forbidden", slug: "forbidden" },
  NOT_FOUND: { status: 404, title: "Not Found", slug: "not-found" },
  CONFLICT: { status: 409, title: "Conflict", slug: "conflict" },
  PAYLOAD_TOO_LARGE: { status: 413, title: "Payload Too Large", slug: "payload-too-large" },
  UNSUPPORTED_MEDIA_TYPE: {
    status: 415,
    title: "Unsupported Media Type",
    slug: "unsupported-media-type",
  },
  TOO_MANY_REQUESTS: { status: 429, title: "Too Many Requests", slug: "too-many-requests" },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    title: "Internal Server Error",
    slug: "internal-server-error",
  },
  SERVICE_UNAVAILABLE: { status: 503, title: "Service Unavailable", slug: "service-unavailable" },
} as const

export type ErrorCode = keyof typeof problems

export const ErrorCode = Object.fromEntries(Object.keys(problems).map((code) => [code, code])) as {
  [C in ErrorCode]: C
}

export type ApiErrorStatus = (typeof problems)[ErrorCode]["status"]

export interface ProblemDetails<C extends ErrorCode = ErrorCode> {
  type: string
  title: string
  status: (typeof problems)[C]["status"]
  detail: string
  /** `urn:cf-ray:<id>` when the request came through Cloudflare's edge */
  instance?: string
  /** Extension member: the stable value clients branch on */
  code: C
}

const codeBySlug = new Map<string, ErrorCode>(
  (Object.keys(problems) as ErrorCode[]).map((code) => [problems[code].slug, code])
)

export function getProblemType(code: ErrorCode): string {
  return `${PROBLEM_TYPE_PREFIX}${problems[code].slug}`
}

export function getErrorCodeFromProblemType(type: unknown): ErrorCode | undefined {
  if (typeof type !== "string" || !type.startsWith(PROBLEM_TYPE_PREFIX)) return undefined
  return codeBySlug.get(type.slice(PROBLEM_TYPE_PREFIX.length))
}

/** `code` alone decides the standard members; callers supply only `detail` and the ray id */
export function createProblemDetails<C extends ErrorCode>(
  code: C,
  detail: string,
  options: { rayId?: string | null } = {}
): ProblemDetails<C> {
  const { status, title } = problems[code]
  return {
    type: getProblemType(code),
    title,
    status,
    detail,
    code,
    ...(options.rayId ? { instance: `urn:cf-ray:${options.rayId}` } : {}),
  }
}

/** Whether a response body follows this contract exactly (extension members allowed) */
export function isProblemDetails(value: unknown): value is ProblemDetails {
  if (typeof value !== "object" || value === null) return false
  const body = value as Record<string, unknown>
  const code = body.code
  if (typeof code !== "string" || !(code in problems)) return false
  const known = problems[code as ErrorCode]
  return (
    body.status === known.status &&
    getErrorCodeFromProblemType(body.type) === code &&
    typeof body.title === "string" &&
    body.title.length > 0 &&
    typeof body.detail === "string" &&
    (body.instance === undefined ||
      (typeof body.instance === "string" && body.instance.startsWith("urn:cf-ray:")))
  )
}

/** The response every `/api/*` route returns on failure. Reads `cf-ray` from the request. */
export function problemResponse(
  request: Request,
  code: ErrorCode,
  detail: string,
  init: { headers?: HeadersInit; extensions?: Record<string, unknown> } = {}
): Response {
  const body = {
    ...createProblemDetails(code, detail, { rayId: request.headers.get("cf-ray") }),
    ...init.extensions,
  }
  const headers = new Headers(init.headers)
  headers.set("content-type", PROBLEM_MEDIA_TYPE)
  return new Response(JSON.stringify(body), { status: body.status, headers })
}
