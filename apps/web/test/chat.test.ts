import { describe, expect, it } from "vite-plus/test"

import { sendInput, sendProblem } from "../src/lib/chat.ts"
import { DEFAULT_MODEL } from "../src/lib/models.ts"

const file = (bytes: number, name = "a.txt") => new File([new Uint8Array(bytes)], name)
const problem = (input: unknown) => {
  const result = sendInput.safeParse(input)
  return result.success ? null : sendProblem(result.error)
}

describe("sendInput", () => {
  it("accepts a message with files and trims its text", () => {
    const result = sendInput.parse({ content: "  hi  ", model: DEFAULT_MODEL, files: [file(3)] })
    expect(result.content).toBe("hi")
    expect(result.files).toHaveLength(1)
  })

  it("answers a file over 5 MB as too large, with the limit in the sentence", () => {
    expect(
      problem({ content: "", model: DEFAULT_MODEL, files: [file(5 * 1024 * 1024 + 1)] })
    ).toEqual({
      tooLarge: true,
      detail: "Files can be up to 5 MB each.",
    })
  })

  it("answers an empty file as too large, as docs/api.md says", () => {
    expect(problem({ content: "x", model: DEFAULT_MODEL, files: [file(0)] })).toEqual({
      tooLarge: true,
      detail: "Files can't be empty.",
    })
  })

  it("caps the number of files", () => {
    const files = Array.from({ length: 5 }, () => file(1))
    expect(problem({ content: "x", model: DEFAULT_MODEL, files })).toEqual({
      tooLarge: false,
      detail: "Attach up to 4 files.",
    })
  })

  it("needs text or a file", () => {
    expect(problem({ content: "   ", model: DEFAULT_MODEL, files: [] })).toEqual({
      tooLarge: false,
      detail: "Write a message or attach a file.",
    })
  })

  it("names the model when it is unknown", () => {
    expect(problem({ content: "x", model: "gpt-9", files: [] })).toEqual({
      tooLarge: false,
      detail: "Pick a model.",
    })
  })

  it("never shows Zod's own wording for a wrong type", () => {
    expect(problem({ content: null, model: DEFAULT_MODEL, files: ["not a file"] })).toEqual({
      tooLarge: false,
      detail: "Send the message as form data.",
    })
  })
})
