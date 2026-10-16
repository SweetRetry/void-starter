/**
 * Freezes packages/ui/src/components (F1): every file in scope must match the baseline byte for byte.
 *
 * The baseline is the last explicitly accepted state, not necessarily upstream's latest. Two
 * questions get separate answers. This script answers "did we change it?" (offline,
 * deterministic, in CI). `shadcn diff <component>` answers "did upstream change?" (online,
 * manual, at upgrade time). Scope and the unfreeze flow: AGENTS.md › Architecture.
 *
 * Usage:
 *   node scripts/ui-freeze.js            check; exit 1 on drift
 *   node scripts/ui-freeze.js --update   accept the current state and rewrite the baseline
 *
 * Output: ✓ and the file count when clean; otherwise each file as M/A/D, with what to do.
 */

import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const MANIFEST = "packages/ui/frozen.manifest.json"

const MANIFEST_COMMENT =
  "F1 baseline: files in scope must match byte for byte. The baseline is the last explicitly accepted state, not necessarily upstream's latest; shadcn diff answers that at upgrade time. Accept a change with pnpm ui:freeze:update and commit it on its own, saying whether it is an upstream upgrade or a recorded unfreeze."

function readManifest() {
  try {
    return JSON.parse(readFileSync(join(repositoryRoot, MANIFEST), "utf8"))
  } catch (error) {
    console.error(`✗ Cannot read the baseline ${MANIFEST}: ${error.message}`)
    process.exit(1)
  }
}

/** Normalize line endings so a CRLF checkout doesn't read as drift. */
function hashFile(relativePath) {
  const content = readFileSync(join(repositoryRoot, relativePath), "utf8")

  return createHash("sha256").update(content.replace(/\r\n/g, "\n"), "utf8").digest("hex")
}

function listScopeFiles(scope) {
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", ...scope],
    { cwd: repositoryRoot, encoding: "utf8" }
  )

  return output
    .split("\0")
    .filter(Boolean)
    .filter((file) => !basename(file).startsWith("."))
    .sort()
}

function currentHashes(scope) {
  const hashes = new Map()

  for (const file of listScopeFiles(scope)) {
    // git ls-files --cached still lists deleted files; the diff reports them as D.
    if (!existsSync(join(repositoryRoot, file))) {
      continue
    }

    hashes.set(file, hashFile(file))
  }

  return hashes
}

function diffFiles(recorded, current) {
  const changes = []

  for (const [file, hash] of current) {
    const previous = recorded.get(file)

    if (previous === undefined) {
      changes.push({ status: "A", file })
    } else if (previous !== hash) {
      changes.push({ status: "M", file })
    }
  }

  for (const file of recorded.keys()) {
    if (!current.has(file)) {
      changes.push({ status: "D", file })
    }
  }

  return changes.sort((a, b) => a.file.localeCompare(b.file))
}

function writeManifest(hashes) {
  const files = {}

  for (const file of [...hashes.keys()].sort()) {
    files[file] = hashes.get(file)
  }

  const manifest = { $comment: MANIFEST_COMMENT, scope: readManifest().scope, files }

  writeFileSync(join(repositoryRoot, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
}

function reportDrift(changes) {
  const scopeLabel = readManifest().scope.join(", ")

  console.log(`✗ ${scopeLabel} drifted from the F1 baseline\n`)

  for (const change of changes) {
    console.log(`  ${change.status} ${change.file}`)
  }

  console.log()
  console.log("This scope is upstream shadcn/ui code and is byte-frozen. What to do:")
  console.log("  · Accidental edit   git checkout -- <file>")
  console.log('  · Upstream upgrade  pnpm ui:freeze:update; say "upstream upgrade" in the commit')
  console.log(
    "  · Compare upstream  shadcn diff <component> (online, manual; this script stays offline)"
  )
  console.log("  · New component     shadcn add, then pnpm ui:freeze:update in its own commit")
  console.log("  · New look          belongs in a recipe (packages/ui/src/recipes or the app),")
  console.log("                      not in the component, until a second app needs it too.")

  process.exitCode = 1
}

function main() {
  const update = process.argv.includes("--update")
  const manifest = readManifest()
  const scope = manifest.scope

  if (!Array.isArray(scope) || scope.length === 0) {
    console.error(`✗ ${MANIFEST} has no scope, so there is nothing to freeze`)
    process.exit(1)
  }

  const current = currentHashes(scope)

  if (update) {
    const recorded = new Map(Object.entries(manifest.files ?? {}))
    const changes = diffFiles(recorded, current)

    if (changes.length === 0) {
      console.log(`✓ The baseline is already current (${current.size} files)`)
      return
    }

    writeManifest(current)
    console.log(`✓ Rewrote ${MANIFEST} (${current.size} files, ${changes.length} changes)`)

    for (const change of changes) {
      console.log(`  ${change.status} ${change.file}`)
    }

    console.log(
      "→ Commit this on its own and say whether it is an upstream upgrade or a recorded unfreeze."
    )
    return
  }

  const changes = diffFiles(new Map(Object.entries(manifest.files ?? {})), current)

  if (changes.length === 0) {
    console.log(`✓ ${scope.join(", ")} matches the F1 baseline (${current.size} files)`)
    return
  }

  reportDrift(changes)
}

main()
