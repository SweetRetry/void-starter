import { describe, expect, it } from "vite-plus/test"

import { problemResponse } from "../src/server/problem.ts"

describe("problemResponse", () => {
  it("answers problem+json with the mapped status and the ray id as instance", async () => {
    const request = new Request("https://example.com/api/notes/1", {
      headers: { "cf-ray": "8f1c2d-SJC" },
    })
    const response = problemResponse(request, "NOT_FOUND", "Note not found.")
    expect(response.status).toBe(404)
    expect(response.headers.get("content-type")).toBe("application/problem+json")
    expect(await response.json()).toEqual({
      title: "Not Found",
      status: 404,
      detail: "Note not found.",
      code: "NOT_FOUND",
      instance: "urn:cf-ray:8f1c2d-SJC",
    })
  })

  it("omits instance outside Cloudflare's edge", async () => {
    const response = problemResponse(
      new Request("http://localhost:5173/api/notes/1"),
      "UNAUTHORIZED",
      "Sign in to use this endpoint."
    )
    expect(await response.json()).toEqual({
      title: "Unauthorized",
      status: 401,
      detail: "Sign in to use this endpoint.",
      code: "UNAUTHORIZED",
    })
  })

  it("keeps extra headers and extension members", async () => {
    const response = problemResponse(
      new Request("http://localhost:5173/api/notes/1/summary"),
      "TOO_MANY_REQUESTS",
      "AI is busy. Try again shortly.",
      { headers: { "retry-after": "5" }, extensions: { retryAt: "2026-10-16T12:00:05Z" } }
    )
    expect(response.status).toBe(429)
    expect(response.headers.get("retry-after")).toBe("5")
    expect(await response.json()).toMatchObject({
      code: "TOO_MANY_REQUESTS",
      retryAt: "2026-10-16T12:00:05Z",
    })
  })
})
