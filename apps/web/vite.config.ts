import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { voidPlugin } from "void"

export default defineConfig(({ command }) => {
  // Prerendering runs the built Worker in a preview server. On a connected clone its Workers AI
  // binding opens a remote session that keeps `vite build` from exiting, and the static page
  // needs no AI, so builds use local bindings only. Dev keeps remote AI.
  if (command === "build") process.env.CLOUDFLARE_VITE_FORCE_LOCAL = "true"

  return {
    resolve: { tsconfigPaths: true },
    plugins: [
      // voidPlugin wraps @cloudflare/vite-plugin and must come before tanstackStart.
      voidPlugin(),
      // The blog post at `/` is static: prerendered to dist/client at build, served as an asset.
      tanstackStart({ pages: [{ path: "/", prerender: { enabled: true, crawlLinks: false } }] }),
      react(),
      tailwindcss(),
    ],
  }
})
