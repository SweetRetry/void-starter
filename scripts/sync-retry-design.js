/**
 * Sync the Retry design language from SweetRetry/retry-design at a pinned commit.
 *
 * Usage:
 *   node scripts/sync-retry-design.js           re-download the pinned commit
 *   node scripts/sync-retry-design.js <sha>     move the pin to <sha>, then download
 *
 * Input: packages/ui/retry.lock.json ({ "repository", "commit" }). The repository is private,
 * so files come through the GitHub CLI with your own login (`gh auth login`).
 * Output: the root DESIGN.md and packages/ui/src/styles/retry.css, byte-identical
 * to upstream. Exits 1 when any download fails, leaving every file untouched.
 */

import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const lockPath = join(root, "packages/ui/retry.lock.json")
const files = {
  "DESIGN.md": "DESIGN.md",
  "globals.css": "packages/ui/src/styles/retry.css",
}

const lock = JSON.parse(readFileSync(lockPath, "utf8"))
const commit = process.argv[2] ?? lock.commit

if (!/^[0-9a-f]{40}$/.test(commit)) {
  console.error(`✗ Expected a full 40-character commit sha, got "${commit}".`)
  process.exit(1)
}

const downloads = Object.entries(files).map(([source, target]) => {
  try {
    const content = execFileSync(
      "gh",
      [
        "api",
        "-H",
        "Accept: application/vnd.github.raw",
        `repos/${lock.repository}/contents/${source}?ref=${commit}`,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    )
    return [target, content]
  } catch (error) {
    console.error(`✗ Could not download ${source} at ${commit}: ${error.stderr || error.message}`)
    process.exit(1)
  }
})

for (const [target, content] of downloads) writeFileSync(join(root, target), content)
writeFileSync(lockPath, `${JSON.stringify({ ...lock, commit }, null, 2)}\n`)

console.log(`✓ Retry synced at ${lock.repository}@${commit.slice(0, 7)}.`)
