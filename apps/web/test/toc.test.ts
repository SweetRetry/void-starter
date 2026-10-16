import { describe, expect, it } from "vite-plus/test"

import { headingsOf, readingMinutes, slugify } from "../src/lib/toc.ts"

describe("headingsOf", () => {
  it("lists h2 and h3, strips code ticks, and skips fenced code", () => {
    const markdown = [
      "# Title",
      "## What Void does",
      "```sh",
      "## not a heading",
      "```",
      "### `pnpm deploy` is taken",
    ].join("\n")
    expect(headingsOf(markdown)).toEqual([
      { id: "what-void-does", text: "What Void does", depth: 2 },
      { id: "pnpm-deploy-is-taken", text: "pnpm deploy is taken", depth: 3 },
    ])
  })
})

describe("slugify", () => {
  it("keeps letters and digits in any script", () => {
    expect(slugify("Workers AI has no local simulator")).toBe("workers-ai-has-no-local-simulator")
    expect(slugify("部署 D1, R2!")).toBe("部署-d1-r2")
  })
})

describe("readingMinutes", () => {
  it("counts English words and CJK characters with a 1-minute floor", () => {
    expect(readingMinutes("Short note.")).toBe(1)
    expect(readingMinutes("word ".repeat(600))).toBe(3)
    expect(readingMinutes("字".repeat(700))).toBe(2)
  })
})
