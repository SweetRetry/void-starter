import type { ApiError, ErrorCode } from "@/lib/api"

/** One status per code. The body carries the code; the status is what HTTP clients see. */
const statuses = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const satisfies Record<ErrorCode, number>

/** The response every `/api/*` route returns on failure. See docs/api.md. */
export function errorResponse(error: ApiError, headers?: HeadersInit): Response {
  return Response.json(error, { status: statuses[error.code], headers })
}
