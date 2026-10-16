import { useMotionValue } from "motion/react"
import type { MotionValue } from "motion/react"
import { useEffect, useRef } from "react"
import type { RefObject } from "react"

/** Where the reading line sits inside the viewport: halfway down. */
const READING_LINE = 0.5

type Reader = (container: HTMLElement) => number

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * Runs `read` on scroll, resize and content mutations — rAF-throttled — and writes
 * the result into a motion value. Motion values keep the rail off React's render
 * path: a long thread writes styles, never a tree diff.
 */
const useScrollReader = (
  containerRef: RefObject<HTMLElement | null>,
  read: Reader
): MotionValue<number> => {
  const focus = useMotionValue(0)
  const readRef = useRef(read)

  useEffect(() => {
    readRef.current = read
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    let frame = 0
    const measure = () => {
      frame = 0
      focus.set(readRef.current(container))
    }
    const schedule = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(measure)
      }
    }

    measure()
    container.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)

    const resize = new ResizeObserver(schedule)
    resize.observe(container)

    // Messages stream in and images decode: both move the layout without a scroll
    // event, and a stale focus is readable on the rail straight away.
    const content = new MutationObserver(schedule)
    content.observe(container, {
      characterData: true,
      childList: true,
      subtree: true,
    })

    return () => {
      if (frame !== 0) {
        cancelAnimationFrame(frame)
      }
      container.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      resize.disconnect()
      content.disconnect()
    }
  }, [containerRef, focus])

  return focus
}

/**
 * Focus from the item sitting on the reading line — the transcript case. Focus is
 * interpolated between the centres of neighbouring items, so the peak glides with
 * the reading line instead of stepping from tick to tick.
 */
export const useMessageFocus = (
  containerRef: RefObject<HTMLElement | null>,
  itemRefs: RefObject<readonly (HTMLElement | null)[]>
): MotionValue<number> => {
  const read = (container: HTMLElement) => {
    const items = itemRefs.current ?? []
    const scrolled = container.scrollTop
    const viewportSize = container.clientHeight
    const line = scrolled + viewportSize * READING_LINE
    const origin = container.getBoundingClientRect().top - scrolled

    // The reading line can never reach the centre of an item that sits closer to the
    // end of the content than half a viewport, so the two ends of the scroll are
    // anchors of their own. Without them the first and last ticks would be
    // unreachable and the rail would never quite fill.
    const range = Math.max(0, container.scrollHeight - viewportSize)
    const lineMin = viewportSize * READING_LINE
    const lineMax = range + lineMin

    const points: { index: number; line: number }[] = []
    let first = -1
    let last = 0

    for (const [index, item] of items.entries()) {
      if (!item) {
        continue
      }
      const rect = item.getBoundingClientRect()
      const center = rect.top - origin + rect.height / 2
      if (first === -1) {
        first = index
      }
      last = index
      const reachable = range === 0 || (center > lineMin && center < lineMax)
      if (reachable) {
        points.push({ index, line: center })
      }
    }

    if (first === -1) {
      return 0
    }

    if (range > 0) {
      points.push({ index: first, line: lineMin }, { index: last, line: lineMax })
    }

    points.sort((a, b) => a.line - b.line)

    // Focus glides between the anchors instead of stepping from tick to tick.
    let previous: { index: number; line: number } | null = null

    for (const point of points) {
      if (line <= point.line) {
        const covered = point.line - (previous?.line ?? point.line)
        if (!previous || covered <= 0) {
          return clamp(point.index, first, last)
        }
        const through = (line - previous.line) / covered
        return clamp(previous.index + through * (point.index - previous.index), first, last)
      }
      previous = point
    }

    return last
  }

  return useScrollReader(containerRef, read)
}
