# Void Starter

Void Starter is a full-stack TypeScript starter in a Turborepo + pnpm workspace. It deploys one Cloudflare Worker with [Void](https://github.com/voidzero-dev/void) and TanStack Start.

## Where things go

Route content by kind: system and usage knowledge → `docs/`; plans not decided yet → `docs/future/`; engineering constraints → `rules/`; repo tooling → `scripts/`. Read `rules/README.md` before adding or changing a rule.

## Vocabulary

- Read [CONTEXT.md](CONTEXT.md) before discussing requirements, designing or naming code, and use its terms.
- When a discussion adds a term, settles an ambiguity or corrects a meaning, update `CONTEXT.md` right away. This is standing permission, even in a pure discussion, unless the user says not to touch files.
- Record only meanings the user confirmed or that the docs and code show. When usage conflicts with the glossary and it matters for the decision at hand, point out the difference and settle it before updating. Never write a guess into the glossary.
- One or two sentences per entry, covering the meaning and its boundary. Note aliases, and list easily confused words under _Avoid_. `CONTEXT.md` holds current definitions only; designs, implementation notes and discussion go where the routing above says.

## Architecture

- `apps/*` own entry points, composition and app-specific business code. `packages/*` hold only capabilities that several apps or processes already share, never what might be reused someday. Cross package boundaries only through public `exports`.
- `packages/ui` owns each component's **own appearance**: height, padding, radius, color and type come from its variants (`variant` / `size`). Call sites control only layout (margin, width, flex or grid placement) and props.
- A new look goes where its reuse is: a variant in the component when several apps need it (an explicit unfreeze), otherwise a recipe (`packages/ui/src/recipes`) or an app component.
- Changes to `packages/ui` and `globals.css` need **HITL** (a human confirms first), so nobody quietly alters a base component or the global styles:
  - `packages/ui/src/components/**` is upstream shadcn/ui code (Base UI, `base-nova`) with Retry's component deltas applied (`DESIGN.md` › Components). It is **byte-frozen (F1)**: the baseline is `packages/ui/frozen.manifest.json`, checked by `pnpm ui:freeze` inside `rules:check`. The baseline is the last accepted state, not upstream's latest; `shadcn diff` answers that at upgrade time. Accept a change with `pnpm ui:freeze:update` in its own commit that says whether it is an upstream upgrade or a recorded unfreeze.
  - `packages/ui/src/styles/globals.css` and `retry.css` hold the theme and tokens. They implement Retry, specified in `DESIGN.md`. Agents never change them silently: propose first and wait for explicit approval.
- Before building something, check the docs, types and extension points of the dependencies already here. Prefer maintained, production-proven libraries.
- Tests never start or depend on a container runtime. Integration checks that need outside resources run in an explicit integration environment.
- Directory names carry the grouping. Inside a directory that already names the domain, a file name says only its own job: `server/notes.functions.ts`, not `server/server-notes-functions.ts`.
- `*.server.ts` modules are server-only. Server functions (`createServerFn`) live in `*.functions.ts` and may import them; components and `src/lib` never do.

[docs/architecture.md](docs/architecture.md) describes each app and package, the request path and the decisions behind the stack.

## Rules by trigger

| Trigger                                             | Read first                                                       |
| :-------------------------------------------------- | :--------------------------------------------------------------- |
| Void: bindings, CLI, config, deploy                 | `.agents/skills/void/SKILL.md` (ships with the installed `void`) |
| Using Zod or changing validation                    | `rules/zod-v4/README.md`                                         |
| Frontend UI: screens, layout, motion, components    | [DESIGN.md](DESIGN.md)                                           |
| `/api/*` routes and error responses                 | [docs/api.md](docs/api.md)                                       |
| Env vars, secrets, deploy, AI Gateway               | [docs/deployment.md](docs/deployment.md)                         |
| What a request actually did: logs, traces, `cf-ray` | [docs/observability.md](docs/observability.md)                   |

## Tech choices

One option per concern. Don't add alternatives.

- Framework: TanStack Start on Void (framework mode). Bindings come from `void/db`, `void/storage`, `void/ai`.
- Database: D1 through Drizzle. Auth: Better Auth.
- Client state: zustand. Toasts: sonner.
- Motion: motion (`motion/react`) or Tailwind CSS transitions.
- Forms: react-hook-form + zod + @hookform/resolvers, rendered with shadcn/ui `Field` and `Controller` (Base UI has no `Form` component).
- Icons: lucide-react (installed in `packages/ui`).
- Dates: dayjs.

## Verification

- For browser E2E, reproducing user journeys, or capturing runtime evidence, read [.agents/skills/verify-web/SKILL.md](.agents/skills/verify-web/SKILL.md). `pnpm e2e` runs the local browser smoke suite. The feature map distinguishes automated checks from journeys that need connected AI.
- After a code change, `pnpm verify` is the one full gate. It runs `format:check`, `md:check`, `lint`, `rules:check`, `typecheck`, `test`, `build` and `knip`. Day-to-day commands are in the root `package.json`.
- Oxfmt shapes Markdown; markdownlint adds only structural rules (fence languages, heading levels, links), configured in `.markdownlint-cli2.jsonc`. Keep them from overlapping, or the two commands keep rewriting the same file.
- Git hooks come from the root `lefthook.yml` and install with `pnpm install`. Pre-commit runs Oxfmt and markdownlint on staged files (and re-stages them) plus `rules:check`. Pre-push runs typecheck and test. Hooks are a subset of `pnpm verify` and don't replace CI. Skip them with `git commit --no-verify` or `LEFTHOOK=0`.
