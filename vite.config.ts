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
      "packages/ui/src/styles/retry.css",
      "packages/ui/frozen.manifest.json",
      "packages/ui/retry/**",
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
    ignorePatterns: ["packages/ui/src/components/**", "**/routeTree.gen.ts", "**/.void/**"],
  },
  test: {
    projects: ["apps/*", "packages/*"],
  },
})
