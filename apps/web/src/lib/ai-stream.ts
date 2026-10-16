/**
 * Incremental parser for the SSE stream `ai.stream()` returns, plus Void's terminal `void:limit`
 * and `void:error` events. Workers AI models answer in one of two frame shapes:
 *
 * - OpenAI-style `choices[0].delta`, with `content` and, for reasoning models such as Qwen3 and
 *   gpt-oss, `reasoning_content`. Qwen3 repeats its text in a `response` field that lags the
 *   delta, so a frame with `choices` is read from `choices` alone.
 * - Classic `{"response": ...}`, where a digit can arrive as a JSON number.
 *
 * The browser uses it to render tokens as they arrive; the server uses it to save the answer.
 */

export type AiStreamEvent =
  | { type: "reasoning"; text: string }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "limit"; message: string; retryAt?: number }
  | { type: "error"; message: string }

type Frame = {
  response?: unknown
  choices?: Array<{ delta?: { content?: unknown; reasoning_content?: unknown } }>
}

const asText = (value: unknown) =>
  typeof value === "string" ? value : typeof value === "number" ? String(value) : ""

function eventsFrom(data: unknown): AiStreamEvent[] {
  if (typeof data !== "object" || data === null) return []
  const frame = data as Frame
  const events: AiStreamEvent[] = []
  if (Array.isArray(frame.choices)) {
    const delta = frame.choices[0]?.delta
    const reasoning = asText(delta?.reasoning_content)
    const content = asText(delta?.content)
    if (reasoning) events.push({ type: "reasoning", text: reasoning })
    if (content) events.push({ type: "delta", text: content })
  } else {
    const content = asText(frame.response)
    if (content) events.push({ type: "delta", text: content })
  }
  return events
}

function parseEvent(block: string): AiStreamEvent[] {
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
    return [
      name === "void:limit"
        ? {
            type: "limit",
            message,
            ...(typeof body.retryAt === "number" && { retryAt: body.retryAt }),
          }
        : { type: "error", message },
    ]
  }
  if (payload === "[DONE]") return [{ type: "done" }]
  if (payload === "") return []
  try {
    return eventsFrom(JSON.parse(payload))
  } catch {
    return []
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
      return blocks.flatMap(parseEvent)
    },
    /** Flush a final event that arrived without a trailing blank line. */
    end(): AiStreamEvent[] {
      const last = buffer.trim() ? parseEvent(buffer) : []
      buffer = ""
      return last
    },
  }
}
