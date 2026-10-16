import { cn } from "@workspace/ui/lib/utils"
import { useEffect, useState } from "react"

import type { Heading } from "@/lib/toc"

/** How far below the viewport top a heading counts as the one being read: the header plus air. */
const READING_LINE = 96

/** The post's anchor nav. The section under the reading line is current. */
export function Toc({
  headings,
  title = true,
  label = "On this page",
}: {
  headings: Heading[]
  title?: boolean
  label?: string
}) {
  const [current, setCurrent] = useState(headings[0]?.id)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      let active = headings[0]?.id
      for (const heading of headings) {
        const node = document.getElementById(heading.id)
        if (node && node.getBoundingClientRect().top <= READING_LINE) active = heading.id
      }
      setCurrent(active)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [headings])

  return (
    <nav aria-label={label} className="text-sm">
      {title && <p className="mb-3 text-xs text-subtle-foreground">{label}</p>}
      <ul className="flex flex-col gap-2">
        {headings.map((heading) => (
          <li key={heading.id} className={cn(heading.depth === 3 && "pl-3")}>
            <a
              href={`#${heading.id}`}
              aria-current={heading.id === current ? "location" : undefined}
              className={cn(
                "block transition-colors hover:text-foreground",
                heading.id === current ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
