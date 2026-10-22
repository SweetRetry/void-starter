import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { readApiError } from "../src/lib/api.ts"
import { DEFAULT_MODEL } from "../src/lib/models.ts"

/**
 * The `/api/*` error contract (docs/api.md), asserted through the route handlers the way a client
 * hits them. Only the platform is faked: D1 answers each awaited query from `rows` in order (an
 * empty result once it runs out), and `ai.stream` refuses the way Workers AI does.
 */
const platform = vi.hoisted(() => {
  const state = {
    visitor: undefined as string | undefined,
    rows: [] as unknown[],
    stream: (() => Promise.reject(new Error("unused"))) as () => Promise<Response>,
  }
  const query: unknown = new Proxy(() => {}, {
    get: (_, key) =>
      key === "then"
        ? (resolve: (rows: unknown) => void, reject: (error: unknown) => void) => {
            const next = state.rows.shift() ?? []
            if (next instanceof Error) reject(next)
            else resolve(next)
          }
        : () => query,
  })
  class UsageLimit extends Error {
    constructor(readonly retryAt?: string) {
      super("AI usage limit exceeded.")
    }
  }
  return { state, query, UsageLimit }
})

vi.mock("@tanstack/react-start/server", () => ({
  getCookie: () => platform.state.visitor,
  setCookie: () => {},
}))
vi.mock("cloudflare:workers", () => ({ waitUntil: () => {} }))
vi.mock("void/db", () => {
  const helper = () => ({})
  return { db: platform.query, and: helper, asc: helper, desc: helper, eq: helper, gt: helper }
})
vi.mock("void/storage", () => ({ storage: { get: async () => null, put: async () => {} } }))
vi.mock("void/ai", () => ({ ai: { stream: () => platform.state.stream() } }))
vi.mock("void/limits", () => ({ UsageLimit: platform.UsageLimit }))
vi.mock("../db/schema.ts", () => ({ chat: {}, message: {}, attachment: {} }))

const { Route: messages } = await import("../src/routes/api/chats/$chatId/messages.ts")
const { Route: answer } = await import("../src/routes/api/chats/$chatId/answer.ts")
const { Route: file } = await import("../src/routes/api/chats/$chatId/files/$fileId.ts")

type Handler = (context: { request: Request; params: unknown }) => Promise<Response>
const handler = (route: { options: unknown }, method: "GET" | "POST") =>
  (route.options as { server: { handlers: Record<string, Handler> } }).server.handlers[method]!

const VISITOR = "7d9c4a52-1f0e-4b8a-9f3d-2c6e8b1a0f47"
const CHAT = "0b6f3c1e-8a2d-4f7b-9c5e-1d3a7e9b2f60"
const FILE = "5e2a9c7d-3b1f-4e6a-8d0c-9f4b2a6e1c38"

function post(path: string, body: BodyInit, headers: HeadersInit = {}) {
  return new Request(`http://localhost:5173/api/chats/${CHAT}/${path}`, {
    method: "POST",
    body,
    headers,
  })
}

function form(fields: Record<string, string | File>) {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.append(name, value)
  return data
}

async function expectError(response: Response, status: number, body: unknown) {
  expect(response.status).toBe(status)
  expect(response.headers.get("content-type")).toBe("application/json")
  expect(await response.json()).toEqual(body)
}

const send = (request: Request, chatId = CHAT) =>
  handler(messages, "POST")({ request, params: { chatId } })

afterEach(() => {
  platform.state.visitor = VISITOR
  platform.state.rows = []
  platform.state.stream = () => Promise.reject(new Error("unused"))
  vi.restoreAllMocks()
})
platform.state.visitor = VISITOR

describe("/api/chats/:chatId/*", () => {
  it("answers a malformed chat id as 404, like someone else's chat", async () => {
    const response = await handler(
      file,
      "GET"
    )({
      request: new Request("http://localhost:5173/api/chats/nope/files/nope"),
      params: { chatId: "nope", fileId: "nope" },
    })
    await expectError(response, 404, { code: "NOT_FOUND", message: "Not found." })
  })

  it("answers 401 without a visitor cookie", async () => {
    platform.state.visitor = undefined
    await expectError(await send(post("messages", form({ content: "hi" }))), 401, {
      code: "UNAUTHORIZED",
      message: "Reload the page to start a session.",
    })
  })

  it("answers another visitor's chat as 404", async () => {
    platform.state.rows = [[{ visitorId: "someone-else" }]]
    await expectError(await send(post("messages", form({ content: "hi" }))), 404, {
      code: "NOT_FOUND",
      message: "Chat not found.",
    })
  })

  it("answers a missing file as 404", async () => {
    platform.state.rows = [[{ visitorId: VISITOR }], []]
    const response = await handler(
      file,
      "GET"
    )({
      request: new Request(`http://localhost:5173/api/chats/${CHAT}/files/${FILE}`),
      params: { chatId: CHAT, fileId: FILE },
    })
    await expectError(response, 404, { code: "NOT_FOUND", message: "File not found." })
  })
})

describe("POST /api/chats/:chatId/messages", () => {
  it("lists each failed field in issues, with the first as the message", async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.txt")
    const response = await send(post("messages", form({ content: "", model: "gpt-9", files: big })))
    await expectError(response, 400, {
      code: "VALIDATION_ERROR",
      message: "Pick a model.",
      issues: [
        { path: "model", message: "Pick a model." },
        { path: "files.0", message: "Files can be up to 5 MB each." },
      ],
    })
  })

  it("never shows Zod's own wording for a wrong type", async () => {
    const response = await send(post("messages", form({ model: DEFAULT_MODEL, files: "text" })))
    await expectError(response, 400, {
      code: "VALIDATION_ERROR",
      message: "Send the message as form data.",
      issues: [
        { path: "content", message: "Send the message as form data." },
        { path: "files.0", message: "Send the message as form data." },
      ],
    })
  })

  it("refuses a body over the limit before reading it", async () => {
    const request = post("messages", "x", { "content-length": String(30 * 1024 * 1024) })
    await expectError(await send(request), 400, {
      code: "VALIDATION_ERROR",
      message: "The message is too large to send.",
    })
  })

  it("answers 503 while AI isn't connected", async () => {
    platform.state.stream = () => Promise.reject(new Error("ai: Not available in this context"))
    const response = await send(post("messages", form({ content: "hi", model: DEFAULT_MODEL })))
    await expectError(response, 503, {
      code: "SERVICE_UNAVAILABLE",
      message: "AI isn't connected yet. Run `pnpm connect`, then restart `pnpm dev`.",
    })
  })

  it("answers 429 with retry-after when a usage limit is reached", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-16T12:00:00Z"))
    platform.state.stream = () => Promise.reject(new platform.UsageLimit("2026-10-16T12:00:05Z"))
    const response = await send(post("messages", form({ content: "hi", model: DEFAULT_MODEL })))
    expect(response.headers.get("retry-after")).toBe("5")
    await expectError(response, 429, {
      code: "TOO_MANY_REQUESTS",
      message: "AI is busy. Try again shortly.",
    })
  })

  it("answers an unexpected failure as 500 with the ray id as traceId, and logs it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    platform.state.rows = [[], new Error("D1_ERROR: no such table: chat")]
    const request = post("messages", form({ content: "hi", model: DEFAULT_MODEL }), {
      "cf-ray": "8f1c2d3b4a5e6f70-SJC",
    })
    await expectError(await send(request), 500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong on our side.",
      traceId: "8f1c2d3b4a5e6f70-SJC",
    })
    expect(log.mock.calls[0]?.[0]).toBe("api.failed")
    expect(log.mock.calls[0]?.[1]).toMatchObject({ traceId: "8f1c2d3b4a5e6f70-SJC" })
  })
})

describe("POST /api/chats/:chatId/answer", () => {
  const regenerate = (body: string) =>
    handler(answer, "POST")({ request: post("answer", body), params: { chatId: CHAT } })

  it("asks for a model when the body isn't one", async () => {
    await expectError(await regenerate("not json"), 400, {
      code: "VALIDATION_ERROR",
      message: "Pick a model.",
      issues: [{ path: "", message: "Pick a model." }],
    })
  })

  it("answers 404 when the chat has no turn to answer", async () => {
    await expectError(await regenerate(JSON.stringify({ model: DEFAULT_MODEL })), 404, {
      code: "NOT_FOUND",
      message: "There's no message to answer.",
    })
  })
})

describe("readApiError", () => {
  it("reads a contract body from a failed response", async () => {
    const body = { code: "INTERNAL_SERVER_ERROR", message: "Something broke.", traceId: "abc" }
    expect(await readApiError(Response.json(body, { status: 500 }))).toEqual(body)
  })

  it("gives undefined for a body outside the contract", async () => {
    const page = new Response("<h1>502 Bad Gateway</h1>", { status: 502 })
    expect(await readApiError(page)).toBeUndefined()
    const legacy = Response.json({ title: "Not Found", status: 404, detail: "Gone." })
    expect(await readApiError(legacy)).toBeUndefined()
  })
})
