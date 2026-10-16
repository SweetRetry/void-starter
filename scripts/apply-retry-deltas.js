/**
 * Apply Retry's component deltas (DESIGN.md › Components) to the shadcn/ui
 * Base UI components in packages/ui/src/components.
 *
 * Run it right after regenerating components from upstream, then accept the result:
 *   node scripts/apply-retry-deltas.js
 *   pnpm ui:freeze:update
 *
 * Run it once, on freshly generated components. Each delta is an exact substring swap; a missing
 * anchor means upstream changed the class string (or the deltas are already applied), so the
 * script exits 1, names every miss, and writes nothing.
 */

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const componentsDir = join(
  resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  "packages/ui/src/components"
)

/** Shared swaps for filled fields (Input, Textarea, Select trigger). */
const filledField = [
  [" bg-transparent ", " bg-muted "],
  ["placeholder:text-muted-foreground", "placeholder:text-subtle-foreground"],
  ["focus-visible:ring-ring/50", "focus-visible:ring-ring-soft"],
  [" disabled:opacity-50", " disabled:text-subtle-foreground"],
  [" dark:bg-input/30", ""],
]

/** Off state on surface tones, focus through Retry's global outline. */
const toggleControl = [
  ["focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50", ""],
  [" dark:bg-input/30", " bg-surface-2"],
]

/** Floating layers: bg-popover, a 1px border instead of a ring, rounded-md. */
const floatingLayer = [["rounded-lg bg-popover", "rounded-md border bg-popover"]]

/** @type {Record<string, Array<[string, string]>>} */
const deltas = {
  "button.tsx": [
    // Focus is the global 2px ring outline; disabled is a tone, never opacity.
    [
      "transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
      "transition-colors select-none",
    ],
    ["disabled:opacity-50", "disabled:bg-surface-1 disabled:text-subtle-foreground"],
    ['default: "bg-primary text-primary-foreground hover:bg-primary/80"', 'default: "bg-primary text-primary-foreground hover:bg-primary-hover"'],
    // No outline variant in Retry.
    [
      '        outline:\n          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",\n',
      "",
    ],
    ["hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]", "hover:bg-secondary-hover"],
    [
      '"hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50"',
      '"hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground"',
    ],
    [
      '"bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40"',
      '"bg-destructive-soft text-destructive hover:bg-destructive/20"',
    ],
  ],
  // Callers of the removed outline variant move to secondary.
  "carousel.tsx": [['variant = "outline",', 'variant = "secondary",']],
  "dialog.tsx": [
    ['<Button variant="outline" />', '<Button variant="secondary" />'],
    // Dialog sits on bg-background over its overlay, rounded-lg, bordered.
    ["rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10", "rounded-lg border bg-background p-4 text-sm text-foreground"],
  ],
  "alert-dialog.tsx": [
    ['variant = "outline",', 'variant = "secondary",'],
    ["rounded-xl bg-popover p-4 text-popover-foreground ring-1 ring-foreground/10", "rounded-lg border bg-background p-4 text-foreground"],
  ],
  "context-menu.tsx": [...floatingLayer, [" ring-1 ring-foreground/10", ""]],
  "hover-card.tsx": [...floatingLayer, [" ring-1 ring-foreground/10", ""]],
  "menubar.tsx": [...floatingLayer, [" ring-1 ring-foreground/10", ""]],
  "navigation-menu.tsx": [...floatingLayer, [" ring-1 ring-foreground/10", ""]],
  "pagination.tsx": [['variant={isActive ? "outline" : "ghost"}', 'variant={isActive ? "secondary" : "ghost"}']],
  "card.tsx": [[" ring-1 ring-foreground/10", ""]],
  "input.tsx": [...filledField, [" disabled:bg-input/50", " disabled:bg-surface-1"], [" dark:disabled:bg-input/80", ""]],
  "textarea.tsx": [...filledField, [" disabled:bg-input/50", " disabled:bg-surface-1"], [" dark:disabled:bg-input/80", ""]],
  "select.tsx": [...filledField, [" dark:hover:bg-input/50", ""], ...floatingLayer, [" ring-1 ring-foreground/10", ""]],
  "skeleton.tsx": [["bg-muted", "bg-surface-2"]],
  "tabs.tsx": [
    // Active tab is a tone step; no ring, shadow or input fill.
    [
      "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
      "data-active:bg-surface-2 data-active:text-foreground",
    ],
  ],
  "popover.tsx": [...floatingLayer, [" ring-1 ring-foreground/10", ""]],
  "dropdown-menu.tsx": [...floatingLayer, [" ring-1 ring-foreground/10", ""]],
  "sheet.tsx": [["bg-popover bg-clip-padding text-sm text-popover-foreground", "bg-background bg-clip-padding text-sm text-foreground"]],
  "table.tsx": [
    // Rows are separated by a top line; no outer border.
    ['"[&_tr]:border-b"', '"[&_tr]:border-t-0"'],
    ['"[&_tr:last-child]:border-0"', '""'],
    ['"border-b transition-colors', '"border-t transition-colors'],
  ],
  "switch.tsx": [
    [" transition-all outline-none", " transition-colors outline-none"],
    ["focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50", ""],
    ["data-unchecked:bg-input dark:data-unchecked:bg-input/80", "data-unchecked:bg-surface-3"],
  ],
  "checkbox.tsx": toggleControl,
  "radio-group.tsx": toggleControl,
  "sonner.tsx": [
    // Retry is class-driven (.dark on <html>); the toaster reads tokens, not next-themes.
    ['import { useTheme } from "next-themes"\n', ""],
    ['  const { theme = "system" } = useTheme()\n\n', ""],
    ["      theme={theme as ToasterProps[\"theme\"]}\n", ""],
    ['"--border-radius": "var(--radius)"', '"--border-radius": "calc(var(--radius) - 2px)"'],
  ],
}

const failures = []
const results = []

for (const [file, swaps] of Object.entries(deltas)) {
  const path = join(componentsDir, file)
  let source = readFileSync(path, "utf8")
  for (const [from, to] of swaps) {
    if (source.includes(from)) {
      source = source.split(from).join(to)
    } else {
      failures.push(`${file}: anchor not found: ${from.slice(0, 80)}`)
    }
  }
  results.push([path, source])
}

if (failures.length > 0) {
  console.error("✗ Upstream changed; update these anchors in scripts/apply-retry-deltas.js:")
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}

for (const [path, source] of results) writeFileSync(path, source)
console.log(`✓ Retry deltas applied to ${results.length} components.`)
