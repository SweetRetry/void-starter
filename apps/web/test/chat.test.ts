import { describe, expect, it } from "vite-plus/test"

import { sendError, sendInput } from "../src/lib/chat.ts"
import { DEFAULT_MODEL } from "../src/lib/models.ts"

const file = (bytes: number, name = "a.txt") => new File([new Uint8Array(bytes)], name)
const error = (input: unknown) => {
  const result = sendInput.safeParse(input)
  return result.success ? null : sendError(result.error)
}

describe("sendInput", () => {
  it("accepts a message with files and trims its text", () => {
    const result = sendInput.parse({ content: "  hi  ", model: DEFAULT_MODEL, files: [file(3)] })
    expect(result.content).toBe("hi")
    expect(result.files).toHaveLength(1)
  })

  it("answers a file over 5 MB with the limit in the sentence", () => {
    expect(
      error({ content: "", model: DEFAULT_MODEL, files: [file(5 * 1024 * 1024 + 1)] })
    ).toEqual({
      code: "VALIDATION_ERROR",
      message: "Files can be up to 5 MB each.",
      issues: [{ path: "files.0", message: "Files can be up to 5 MB each." }],
    })
  })

  it("refuses an empty file", () => {
    expect(error({ content: "x", model: DEFAULT_MODEL, files: [file(0)] })).toEqual({
      code: "VALIDATION_ERROR",
      message: "Files can't be empty.",
      issues: [{ path: "files.0", message: "Files can't be empty." }],
    })
  })

  it("caps the number of files", () => {
    const files = Array.from({ length: 5 }, () => file(1))
    expect(error({ content: "x", model: DEFAULT_MODEL, files })).toEqual({
      code: "VALIDATION_ERROR",
      message: "Attach up to 4 files.",
      issues: [{ path: "files", message: "Attach up to 4 files." }],
    })
  })

  it("needs text or a file", () => {
    expect(error({ content: "   ", model: DEFAULT_MODEL, files: [] })).toEqual({
      code: "VALIDATION_ERROR",
      message: "Write a message or attach a file.",
      issues: [{ path: "", message: "Write a message or attach a file." }],
    })
  })
})
