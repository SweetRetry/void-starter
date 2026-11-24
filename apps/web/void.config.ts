import { defineConfig } from "void/config"

export default defineConfig({
  worker: {
    compatibility_date: "2026-10-01",
    compatibility_flags: ["nodejs_compat"],
  },
  // Passed through to Wrangler. `name` is the Worker (and its workers.dev subdomain); change it
  // for your app. `workers_dev: false` keeps the public workers.dev URL closed: anyone with it
  // could spend the account's Workers AI allowance. Set it to `true` to open the app.
  // `preview_urls` stays on because `void deploy` checks each new version's /__void/ready
  // through its preview URL before it shifts traffic. `observability` turns on Workers Logs
  // and Traces.
  // The app reads its own writes without D1 session bookmarks, so replicas stay off. void 1.11
  // defaults new databases to off; this also turns them off on a database deployed earlier.
  database: { readReplication: false },
  cloudflare: {
    name: "void-starter",
    workers_dev: false,
    preview_urls: true,
    observability: {
      enabled: true,
      logs: { enabled: true, invocation_logs: true },
      traces: { enabled: true },
    },
  },
})
