/**
 * Incremental parser for the SSE stream `ai.stream()` returns: Workers AI frames
 * (`data: {"response": "..."}` or OpenAI-style `choices[0].delta.content`, ending in `[DONE]`)
 * plus Void's terminal `void:limit` and `void:error` events. The browser uses it to render
 * tokens as they arrive; the server uses it to save the finished summary.
 */

export type AiStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "limit"; message: string; retryAt?: number }
  | { type: "error"; message: string }

function textFrom(data: unknown): string {
  if (typeof data !== "object" || data === null) return ""
  const frame = data as { response?: unknown; choices?: Array<{ delta?: { content?: unknown } }> }
  if (typeof frame.response === "string") return frame.response
  const content = frame.choices?.[0]?.delta?.content
  return typeof content === "string" ? content : ""
}

function parseEvent(block: string): AiStreamEvent | undefined {
  let name = "message"
  const data: string[] = []
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) name = line.slice(6).trim()
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart())
  }
  const payload = data.join("\n")
  if (name === "void:limit" || name === "void:error") {
    let body: { message?: unknown; detail?: unknown; retryAt?: unknown } = {}
    try {
      body = JSON.parse(payload)
    } catch {}
    const message =
      typeof body.detail === "string"
        ? body.detail
        : typeof body.message === "string"
          ? body.message
          : "Generation was interrupted."
    return name === "void:limit"
      ? {
          type: "limit",
          message,
          ...(typeof body.retryAt === "number" && { retryAt: body.retryAt }),
        }
      : { type: "error", message }
  }
  if (payload === "[DONE]") return { type: "done" }
  if (payload === "") return undefined
  try {
    const text = textFrom(JSON.parse(payload))
    return text ? { type: "delta", text } : undefined
  } catch {
    return undefined
  }
}

export function createAiStreamParser() {
  let buffer = ""
  return {
    /** Feed decoded text; returns every event completed by this chunk. */
    push(chunk: string): AiStreamEvent[] {
      buffer += chunk.replaceAll("\r\n", "\n")
      const blocks = buffer.split("\n\n")
      buffer = blocks.pop() ?? ""
      return blocks.map(parseEvent).filter((event) => event !== undefined)
    },
    /** Flush a final event that arrived without a trailing blank line. */
    end(): AiStreamEvent[] {
      const last = buffer.trim() ? parseEvent(buffer) : undefined
      buffer = ""
      return last ? [last] : []
    },
  }
}
