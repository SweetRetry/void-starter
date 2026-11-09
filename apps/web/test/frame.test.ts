import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { frameThrottle } from "../src/lib/frame.ts"

describe("frameThrottle", () => {
  let frames: Map<number, FrameRequestCallback>
  const flush = () => {
    const pending = [...frames.values()]
    frames.clear()
    for (const callback of pending) callback(0)
  }

  beforeEach(() => {
    frames = new Map()
    let id = 0
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.set(++id, callback)
      return id
    })
    vi.stubGlobal("cancelAnimationFrame", (handle: number) => frames.delete(handle))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("runs once per frame however often it is scheduled", () => {
    const run = vi.fn()
    const { schedule } = frameThrottle(run)
    schedule()
    schedule()
    schedule()
    flush()
    expect(run).toHaveBeenCalledTimes(1)
    schedule()
    flush()
    expect(run).toHaveBeenCalledTimes(2)
  })

  it("drops the pending frame on cancel", () => {
    const run = vi.fn()
    const { schedule, cancel } = frameThrottle(run)
    schedule()
    cancel()
    flush()
    expect(run).toHaveBeenCalledTimes(0)
  })
})
