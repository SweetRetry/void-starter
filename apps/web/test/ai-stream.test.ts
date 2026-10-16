import { describe, expect, it } from "vite-plus/test"

import { createAiStreamParser } from "../src/lib/ai-stream.ts"

describe("createAiStreamParser", () => {
  it("joins Workers AI deltas split across chunks and ends on [DONE]", () => {
    const parser = createAiStreamParser()
    const events = [
      ...parser.push('data: {"response":"Short"}\n\ndata: {"resp'),
      ...parser.push('onse":" summary."}\n\ndata: {"response":"","usage":{"total_tokens":9}}\n\n'),
      ...parser.push("data: [DONE]\n\n"),
    ]
    expect(events).toEqual([
      { type: "delta", text: "Short" },
      { type: "delta", text: " summary." },
      { type: "done" },
    ])
  })

  it("reads OpenAI-style delta frames", () => {
    const parser = createAiStreamParser()
    expect(parser.push('data: {"choices":[{"delta":{"content":"Hi"}}]}\r\n\r\n')).toEqual([
      { type: "delta", text: "Hi" },
    ])
  })

  it("splits reasoning from the answer and ignores the lagging response field", () => {
    const parser = createAiStreamParser()
    expect(
      parser.push(
        'data: {"choices":[{"delta":{"reasoning_content":"17 times 3"}}]}\n\n' +
          'data: {"choices":[{"delta":{"content":"51"}}],"response":"5"}\n\n'
      )
    ).toEqual([
      { type: "reasoning", text: "17 times 3" },
      { type: "delta", text: "51" },
    ])
  })

  it("keeps a digit that arrives as a JSON number", () => {
    const parser = createAiStreamParser()
    expect(parser.push('data: {"response":"It is "}\n\ndata: {"response":51}\n\n')).toEqual([
      { type: "delta", text: "It is " },
      { type: "delta", text: "51" },
    ])
  })

  it("turns Void's terminal events into limit and error", () => {
    const parser = createAiStreamParser()
    expect(
      parser.push(
        'event: void:limit\ndata: {"detail":"AI usage limit exceeded.","retryAt":1800000000000}\n\nevent: void:error\ndata: {"message":"Generation was interrupted. Please try again."}\n\n'
      )
    ).toEqual([
      { type: "limit", message: "AI usage limit exceeded.", retryAt: 1_800_000_000_000 },
      { type: "error", message: "Generation was interrupted. Please try again." },
    ])
  })

  it("flushes a last event that has no trailing blank line", () => {
    const parser = createAiStreamParser()
    expect(parser.push("data: [DONE]")).toEqual([])
    expect(parser.end()).toEqual([{ type: "done" }])
  })
})
