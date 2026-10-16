import { defineConfig } from "void/config"

import { AI_GATEWAY_ID } from "./src/server/ai"

export default defineConfig({
  worker: {
    compatibility_date: "2026-10-01",
    compatibility_flags: ["nodejs_compat"],
  },
  // Routes ai.provider().fetch() through AI Gateway. Workers AI calls pass the id per call.
  ai: { gateway: AI_GATEWAY_ID },
  // Passed through to Wrangler: Workers Logs and Traces in the Cloudflare dashboard.
  cloudflare: {
    observability: {
      enabled: true,
      logs: { enabled: true, invocation_logs: true },
      traces: { enabled: true },
    },
  },
})
