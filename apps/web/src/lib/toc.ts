/** One entry of a post's anchor nav. */
export interface Heading {
  id: string
  text: string
  depth: 2 | 3
}

/** "`pnpm deploy` is taken" → "pnpm-deploy-is-taken". Headings and the nav share it. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
}

/** The `##` and `###` headings of a Markdown document, skipping fenced code. */
export function headingsOf(markdown: string): Heading[] {
  const headings: Heading[] = []
  let fenced = false
  for (const line of markdown.split("\n")) {
    if (line.startsWith("```")) fenced = !fenced
    const match = fenced ? null : /^(#{2,3}) (.+)$/.exec(line)
    if (!match) continue
    const text = match[2]!.replace(/`/g, "").trim()
    headings.push({ id: slugify(text), text, depth: match[1]!.length as 2 | 3 })
  }
  return headings
}
