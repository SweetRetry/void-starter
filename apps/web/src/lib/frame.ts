/**
 * Coalesces calls into one `run` on the next animation frame. Scroll, resize and observer
 * callbacks fire many times a frame, and a layout read needs only the latest state.
 */
export function frameThrottle(run: () => void) {
  let frame = 0
  return {
    schedule() {
      if (frame === 0) {
        frame = requestAnimationFrame(() => {
          frame = 0
          run()
        })
      }
    },
    cancel() {
      cancelAnimationFrame(frame)
      frame = 0
    },
  }
}
