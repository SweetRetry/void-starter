# Tooling, UI and guardrails in Void Starter

`void-starter` ships with a preconfigured UI layer and static verification pipeline: Tailwind CSS v4, shadcn/ui on Base UI, the Retry design system, Motif chat blocks, Vite+ (`Oxlint` and `Oxfmt`), `@shadcn/lint`, Knip, `markdownlint-cli2` and Lefthook.

## Design and UI

### Tailwind v4 and Retry

Styling runs on Tailwind CSS v4 and the Retry tokens defined in `DESIGN.md`, `packages/ui/src/styles/retry.css` and `globals.css`:

- **Surfaces**: `oklch()` lightness steps (`background`, `surface-1`, `surface-2`, `surface-3`) with all `shadow-*` utilities emptied.
- **Accent**: `primary` (emerald) is reserved for one primary action per view, text links and focus rings.
- **Typography and motion**: Inter with optical sizing (`opsz`), and a global `<MotionConfig reducedMotion="user">` wrapper in `__root.tsx` setting `[0.2, 0, 0, 1]` at `200ms`.

### shadcn/ui on Base UI

`packages/ui/src/components` contains 47 shadcn/ui components generated on the Base UI (`base-nova`) preset with Retry's adjustments applied:

- **Card**: `bg-card` surface with no outer ring border.
- **Input, Textarea and Select**: filled `bg-muted` backgrounds and `text-subtle-foreground` placeholders.
- **Button**: `default`, `secondary`, `ghost`, `destructive` and `link` variants (no `outline`); disabled states use `bg-surface-1 text-subtle-foreground`.
- **Floating layers**: Popover, Dropdown, Select and Context Menu use `rounded-md border bg-popover` with no shadow.

### F1 component freeze

`packages/ui/frozen.manifest.json` stores the SHA-256 hash of every file in `packages/ui/src/components`. `pnpm ui:freeze` verifies those hashes in pre-commit and CI.

| Command                   | Action                                                    |
| :------------------------ | :-------------------------------------------------------- |
| `pnpm ui:freeze`          | Check `packages/ui/src/components` against SHA-256 hashes |
| `shadcn diff <component>` | Diff a component against upstream shadcn/ui               |
| `pnpm ui:freeze:update`   | Rewrite `frozen.manifest.json` after an update            |

### Motif chat blocks

`apps/web/src/components/chat` and `agents` vendor the chat UI blocks from [Motif](https://motif.sweetretry.com): message thread, attachment composer, model selector, collapsible reasoning block and scroll rail, adapted to Base UI's `render` prop.

## Code and repo gates

`pnpm verify` runs all checks in sequence:

```sh
pnpm verify
# format:check -> md:check -> lint -> rules:check -> typecheck -> test -> build -> knip
```

### Oxlint and Vite+

Root `vite.config.ts` configures Vite+ across the workspace:

- **`vp fmt`**: Oxfmt formatter (100-column print width, no semicolons, sorted `package.json`).
- **`vp lint`**: Oxlint with `typescript`, `react`, `jsx-a11y`, `import` and `@shadcn/lint`.
- **`vp test`**: Vitest across `apps/*` and `packages/*`.

### `@shadcn/lint` rules

`vite.config.ts` enables `@shadcn/lint` on imports from `@workspace/ui/components`:

```ts
rules: {
  "shadcn/no-restyle": ["error", { allow: ["layout"] }],
  "shadcn/no-raw-colors": "error",
  "shadcn/no-unknown-classes": "error",
  "shadcn/require-static-classes": "error",
  "shadcn/no-inline-styles": "error",
  "shadcn/no-arbitrary-values": ["error", { allow: ["layout"] }],
}
```

Call sites pass only layout utilities (`margin`, `width`, flex and grid placement) to shared UI components.

### Custom repo checks

`pnpm rules:check` runs four scripts:

- **`pnpm zod:check`** (`rules/zod-v4/check.js`): checks for deprecated Zod v3 APIs.
- **`pnpm ui:check`** (`.agents/skills/sweet-mode/scripts/ui-guardrails.js`): checks motion, z-index, color and type bans such as `transition-all`, `ease-in` and arbitrary `z-[...]` classes.
- **`pnpm ui:freeze`** (`scripts/ui-freeze.js`): checks the F1 component manifest.
- **`pnpm skills:check`** (`scripts/agent-skills.js`): checks the copied agent skills against their sources.

### Markdown pipeline

- **Oxfmt (`vp fmt`)** formats Markdown tables, list indentation and blank lines.
- **`markdownlint-cli2` (`pnpm md:check`)** checks heading levels, code fence languages and links, with `MD013` (line length) disabled in `.markdownlint-cli2.jsonc`.

### Knip dead-code scan

`pnpm knip` scans the workspace for unused files, exports and dependencies. `knip.json` sets `"vite": false` on `apps/web` and `apps/web/vitest.config.ts` omits `voidPlugin()` so workspace-level runs do not generate `.void/` in the repo root.

### Lefthook

`lefthook.yml` is installed by the root `prepare` script on `pnpm install`:

- **`pre-commit`**: runs `vp fmt --write` on staged code, runs `vp fmt` and `markdownlint-cli2 --no-globs --fix` on staged Markdown (`stage_fixed: true`), and runs `pnpm rules:check`.
- **`pre-push`**: runs `pnpm typecheck` and `pnpm test` in parallel.
