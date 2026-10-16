import { describe, expect, it } from "vite-plus/test"

import {
  createProblemDetails,
  ErrorCode,
  getErrorCodeFromProblemType,
  getProblemType,
  isProblemDetails,
  PROBLEM_MEDIA_TYPE,
  problemResponse,
} from "../src/server/problem.ts"

const codes = Object.values(ErrorCode)

describe("problem details contract", () => {
  it("gives every code a unique type that maps back to the code", () => {
    expect(new Set(codes.map(getProblemType)).size).toBe(codes.length)
    for (const code of codes) expect(getErrorCodeFromProblemType(getProblemType(code))).toBe(code)
  })

  it("derives the standard members from the code alone", () => {
    expect(createProblemDetails(ErrorCode.VALIDATION_ERROR, "title is required")).toEqual({
      type: "https://github.com/SweetRetry/void-starter/blob/main/docs/api.md#validation-error",
      title: "Validation Error",
      status: 400,
      detail: "title is required",
      code: "VALIDATION_ERROR",
    })
  })

  it("carries the Cloudflare ray id as the instance", () => {
    expect(
      createProblemDetails(ErrorCode.NOT_FOUND, "Note not found", { rayId: "8f1c2d" })
    ).toMatchObject({ instance: "urn:cf-ray:8f1c2d" })
    expect(
      createProblemDetails(ErrorCode.NOT_FOUND, "Note not found", { rayId: null })
    ).not.toHaveProperty("instance")
  })

  it("rejects bodies whose type, status, code, title or detail disagree", () => {
    const problem = createProblemDetails(ErrorCode.NOT_FOUND, "Note not found")
    expect(isProblemDetails(problem)).toBe(true)
    expect(isProblemDetails({ ...problem, type: getProblemType(ErrorCode.CONFLICT) })).toBe(false)
    expect(isProblemDetails({ ...problem, status: 500 })).toBe(false)
    expect(isProblemDetails({ ...problem, code: "RATE_LIMITED" })).toBe(false)
    expect(isProblemDetails({ ...problem, title: "" })).toBe(false)
    expect(isProblemDetails({ ...problem, detail: undefined })).toBe(false)
    expect(isProblemDetails({ ...problem, instance: "trace-123" })).toBe(false)
  })

  it("allows RFC 9457 extension members", () => {
    const problem = {
      ...createProblemDetails(ErrorCode.TOO_MANY_REQUESTS, "Try again shortly"),
      retryAt: 1_800_000_000_000,
    }
    expect(isProblemDetails(problem)).toBe(true)
  })

  it("answers with the problem media type, the mapped status and the ray id", async () => {
    const request = new Request("https://example.com/api/notes/1", {
      headers: { "cf-ray": "8f1c2d-SJC" },
    })
    const response = problemResponse(request, ErrorCode.FORBIDDEN, "Not your note", {
      headers: { "retry-after": "5" },
    })
    expect(response.status).toBe(403)
    expect(response.headers.get("content-type")).toBe(PROBLEM_MEDIA_TYPE)
    expect(response.headers.get("retry-after")).toBe("5")
    expect(await response.json()).toEqual({
      type: "https://github.com/SweetRetry/void-starter/blob/main/docs/api.md#forbidden",
      title: "Forbidden",
      status: 403,
      detail: "Not your note",
      code: "FORBIDDEN",
      instance: "urn:cf-ray:8f1c2d-SJC",
    })
  })
})
