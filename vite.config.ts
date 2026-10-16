import { defineConfig } from "vite-plus"

/**
 * Workspace-wide lint, format and test settings for Vite+ (`vp lint`, `vp fmt`, `vp test`).
 * App build and dev settings live in each app's own vite.config.ts.
 */
export default defineConfig({
  fmt: {
    semi: false,
    printWidth: 100,
    trailingComma: "es5",
    sortPackageJson: true,
    ignorePatterns: [
      "**/routeTree.gen.ts",
      "**/db/migrations/**",
      "packages/ui/src/components/**",
      "packages/ui/frozen.manifest.json",
      "pnpm-lock.yaml",
    ],
  },
  lint: {
    plugins: ["typescript", "react", "jsx-a11y", "import"],
    jsPlugins: ["@shadcn/lint"],
    settings: {
      shadcn: {
        note: "Component appearance belongs to packages/ui variants (AGENTS.md › Architecture). Design rules are routed from DESIGN.md.",
        componentImports: ["^@workspace/ui/components"],
      },
    },
    rules: {
      "shadcn/no-restyle": ["error", { allow: ["layout"] }],
      "shadcn/no-raw-colors": "error",
      "shadcn/no-unknown-classes": "error",
      "shadcn/require-static-classes": "error",
      "shadcn/no-inline-styles": "error",
      "shadcn/no-arbitrary-values": ["error", { allow: ["layout"] }],
    },
    ignorePatterns: [
      "packages/ui/src/components/**",
      // Motif registry code (motif.sweetretry.com), vendored by `shadcn add`-style import. Like
      // upstream shadcn/ui, it is linted where it comes from, not here.
      "apps/web/src/components/{agents,scroll-rail}/**",
      "apps/web/src/components/ui/**",
      "apps/web/src/components/chat/chat-app.tsx",
      "apps/web/src/lib/{ease.ts,hooks/**}",
      "**/routeTree.gen.ts",
      "**/.void/**",
    ],
  },
  test: {
    projects: ["apps/*", "packages/*"],
  },
})
