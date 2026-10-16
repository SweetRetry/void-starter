/**
 * Create apps/web/.env with a random BETTER_AUTH_SECRET when it does not exist yet,
 * so `pnpm dev` works on a fresh clone with zero setup. Never touches an existing file.
 * Production never reads .env: set the secret with `void secret put BETTER_AUTH_SECRET`.
 */
import { randomBytes } from "node:crypto"
import { existsSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".env")

if (!existsSync(envPath)) {
  const secret = randomBytes(32).toString("base64url")
  writeFileSync(
    envPath,
    `# Local development only. Production values: void secret put <NAME>\nBETTER_AUTH_SECRET=${secret}\n`
  )
  console.log("Created apps/web/.env with a local BETTER_AUTH_SECRET.")
}
