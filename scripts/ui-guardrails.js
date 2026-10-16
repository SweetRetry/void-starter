/**
 * Scans only for UI bans that leave no room for judgment:
 * - transition-all / transition: all (DESIGN.md › Motion)
 * - arbitrary z-index values
 *
 * Arbitrary radii and spacing are deliberately out of scope: those rules involve judgment
 * (derived corner radii, line-height padding, optical nudges), so a scan would misfire.
 * Review covers them.
 */

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const SELF = "scripts/ui-guardrails.js"

const CHECKS = [
  {
    rule: "design/motion",
    pattern: /\btransition-all\b/g,
    message: "transition-all also animates properties nobody planned for",
    suggestion: "Name the properties, such as transition-[transform,opacity]",
  },
  {
    rule: "design/motion",
    pattern: /\btransition\s*:\s*all\b/g,
    message: "transition: all also animates properties nobody planned for",
    suggestion: "Name the properties, such as transition: transform, opacity",
  },
  {
    rule: "design/z-index",
    pattern: /(?<![\w-])-?z-\[[^\]]+\]/g,
    message: "Arbitrary z-index leaves the semantic scale",
    suggestion: "Use -z-10 / z-0 / z-10 / z-20 / z-30 / z-40 / z-50",
  },
]

function listSourceFiles() {
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: repositoryRoot, encoding: "utf8" }
  )

  return output
    .split("\0")
    .filter(Boolean)
    .filter((file) => /\.(tsx|jsx|ts|css)$/.test(file))
    .filter(
      (file) =>
        !file.includes("node_modules") &&
        !file.includes("/dist/") &&
        !file.startsWith("packages/ui/") &&
        file !== SELF
    )
}

function scanContent(content, file) {
  const findings = []

  for (const check of CHECKS) {
    const lines = content.split("\n")

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index]
      check.pattern.lastIndex = 0
      let match = check.pattern.exec(line)

      while (match !== null) {
        findings.push({
          file,
          line: index + 1,
          column: match.index + 1,
          rule: check.rule,
          match: match[0],
          message: check.message,
          suggestion: check.suggestion,
        })
        match = check.pattern.exec(line)
      }
    }
  }

  return findings
}

function main() {
  const allFindings = []

  for (const file of listSourceFiles()) {
    // git ls-files --cached still lists files deleted from the work tree; scan only what exists.
    if (!existsSync(join(repositoryRoot, file))) {
      continue
    }

    const content = readFileSync(join(repositoryRoot, file), "utf8")
    allFindings.push(...scanContent(content, file))
  }

  if (allFindings.length === 0) {
    console.log("✓ No transition-all or arbitrary z-index found")
    return
  }

  console.log(`Found ${allFindings.length} UI guardrail violation(s):\n`)

  for (const finding of allFindings) {
    console.log(`  ${finding.file}:${finding.line}:${finding.column}`)
    console.log(`    [${finding.rule}] ${finding.match} — ${finding.message}`)
    console.log(`    → ${finding.suggestion}`)
    console.log()
  }

  process.exitCode = 1
}

main()
