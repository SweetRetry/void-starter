import { defineEnv, string } from "void/env"
import { z } from "zod"

/**
 * Server values come from `.env` locally (created by `pnpm dev` on first run) and from
 * `void secret put <NAME>` in production. A social provider turns on only when both its
 * client id and secret are set; see src/server/auth.server.ts.
 */
export default defineEnv({
  BETTER_AUTH_SECRET: z.string().min(32),
  AUTH_GITHUB_CLIENT_ID: string().optional(),
  AUTH_GITHUB_CLIENT_SECRET: string().optional(),
  AUTH_GOOGLE_CLIENT_ID: string().optional(),
  AUTH_GOOGLE_CLIENT_SECRET: string().optional(),
})
