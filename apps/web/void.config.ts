import { defineConfig } from "void/config"

export default defineConfig({
  worker: {
    compatibility_date: "2026-10-01",
    compatibility_flags: ["nodejs_compat"],
  },
  // Passed through to Wrangler. `name` is the Worker (and its workers.dev subdomain); change it
  // for your app. `observability` turns on Workers Logs and Traces.
  cloudflare: {
    name: "void-starter",
    observability: {
      enabled: true,
      logs: { enabled: true, invocation_logs: true },
      traces: { enabled: true },
    },
  },
})
