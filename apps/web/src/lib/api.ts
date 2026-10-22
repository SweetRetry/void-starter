import { z } from "zod"

/**
 * The `/api/*` error contract (docs/api.md): a flat `{ code, message, issues?, traceId? }` body.
 * `issues` comes only with `VALIDATION_ERROR`, `traceId` only with `INTERNAL_SERVER_ERROR`. The
 * routes send it through `errorResponse()`; the browser reads it only through `readApiError()`.
 */
const message = z.string()
const apiError = z.discriminatedUnion("code", [
  z.object({
    code: z.literal("VALIDATION_ERROR"),
    message,
    issues: z.array(z.object({ path: z.string(), message })).optional(),
  }),
  z.object({ code: z.literal("INTERNAL_SERVER_ERROR"), message, traceId: z.string() }),
  z.object({
    code: z.enum([
      "UNAUTHORIZED",
      "FORBIDDEN",
      "NOT_FOUND",
      "CONFLICT",
      "TOO_MANY_REQUESTS",
      "SERVICE_UNAVAILABLE",
    ]),
    message,
  }),
])

export type ApiError = z.infer<typeof apiError>
export type ErrorCode = ApiError["code"]
type ValidationError = Extract<ApiError, { code: "VALIDATION_ERROR" }>

/**
 * A failed parse as a `VALIDATION_ERROR`, its message the first issue's. Every check carries the
 * sentence the person sees; a wrong type means a caller that isn't this app's UI, so Zod's own
 * wording for it gives way to `wrongType`.
 */
export function validationError(error: z.ZodError, wrongType: string): ValidationError {
  const issues = error.issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.code === "invalid_type" ? wrongType : issue.message,
  }))
  return { code: "VALIDATION_ERROR", message: issues[0]?.message ?? wrongType, issues }
}

/**
 * The error body of a failed `/api/*` response, or undefined when the body isn't one (a proxy's
 * page, a cut connection). Branch on `code` and the status; show `message`, never parse it.
 */
export async function readApiError(response: Response): Promise<ApiError | undefined> {
  const body: unknown = await response.json().catch(() => undefined)
  return apiError.safeParse(body).data
}
