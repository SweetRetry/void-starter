#!/usr/bin/env node
/**
 * Run browser smoke journeys against a disposable copy of the real web app.
 * Usage: pnpm e2e [--screenshots] | pnpm e2e --doctor <url>
 * Requires Node 24, installed workspace dependencies and Playwright Chromium.
 * Writes .verification/<run>/ evidence; removes only its own temporary workspace.
 * Exit 0 means all requested checks passed; any setup, journey or cleanup failure exits 1.
 */
import { spawn } from "node:child_process"
import { once } from "node:events"
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  openSync,
  closeSync,
} from "node:fs"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import { fileURLToPath } from "node:url"
import { setTimeout as delay } from "node:timers/promises"
import { parseArgs } from "node:util"

const root = fileURLToPath(new URL("../", import.meta.url))
const { values: options } = parseArgs({
  options: {
    help: { type: "boolean" },
    doctor: { type: "string" },
    screenshots: { type: "boolean", default: false },
  },
})

async function doctor(url) {
  const origin = new URL(url)
  if (!["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)) {
    throw new Error("Doctor accepts local instances only")
  }
  const checks = []
  for (const path of ["/", "/c/00000000-0000-4000-8000-000000000001"]) {
    const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(5000) })
    const body = await response.text()
    const marker = path === "/" ? "Void Starter" : "Your chats show up here."
    if (response.status !== 200 || !body.includes(marker)) {
      throw new Error(`Doctor failed at ${path}: HTTP ${response.status}, missing usable page`)
    }
    checks.push({ path, status: response.status, marker })
  }
  return checks
}

if (options.help) {
  console.log("pnpm e2e [--screenshots]\npnpm e2e --doctor http://127.0.0.1:<port>")
} else if (options.doctor) {
  console.log(JSON.stringify(await doctor(options.doctor), null, 2))
} else {
  if (process.platform === "win32")
    throw new Error("The process-group runner requires macOS or Linux")
  mkdirSync(join(root, ".verification"), { recursive: true })
  const evidence = mkdtempSync(join(root, ".verification", "run-"))
  const scratch = mkdtempSync(join(tmpdir(), "void-e2e-"))
  const children = new Set()
  const result = { status: "failed", evidence, scratch, startedAt: new Date().toISOString() }
  const log = openSync(join(evidence, "server.log"), "a")
  const env = { ...process.env, CLOUDFLARE_VITE_FORCE_LOCAL: "true", BROWSER: "none" }

  function start(command, commandArgs, cwd, output = log) {
    const child = spawn(command, commandArgs, {
      cwd,
      env,
      detached: true,
      stdio: ["ignore", output, output],
    })
    children.add(child)
    child.on("error", (error) => {
      result.error = error.message
    })
    return child
  }

  async function stop(child) {
    if (!child.pid) return
    const signal = (value) => {
      try {
        process.kill(-child.pid, value)
      } catch (error) {
        if (error.code !== "ESRCH") throw error
      }
    }
    signal("SIGTERM")
    for (let attempt = 0; attempt < 30; attempt++) {
      try {
        process.kill(-child.pid, 0)
      } catch (error) {
        if (error.code === "ESRCH") {
          children.delete(child)
          return
        }
        throw error
      }
      await delay(100)
    }
    signal("SIGKILL")
    children.delete(child)
  }

  let interrupted = false
  const interrupt = () => {
    interrupted = true
    for (const child of children) {
      try {
        process.kill(-child.pid, "SIGTERM")
      } catch {
        /* Already exited. */
      }
    }
  }
  process.on("SIGINT", interrupt)
  process.on("SIGTERM", interrupt)
  const watchdog = setTimeout(interrupt, 240_000)
  writeFileSync(
    join(evidence, "result.json"),
    JSON.stringify({ ...result, status: "running" }, null, 2)
  )

  try {
    console.log(`Evidence: ${evidence}`)
    const excluded = new Set([
      "node_modules",
      ".void",
      ".wrangler",
      ".tanstack",
      "dist",
      ".turbo",
      "void.lock.json",
      ".void-wrangler.jsonc",
    ])
    for (const directory of ["apps/web", "packages/ui", "packages/typescript-config"]) {
      const target = join(scratch, directory)
      cpSync(join(root, directory), target, {
        recursive: true,
        filter: (path) => !excluded.has(basename(path)) && !basename(path).startsWith(".env"),
      })
      const modules = join(root, directory, "node_modules")
      if (existsSync(modules)) {
        mkdirSync(join(target, "node_modules"))
        for (const entry of readdirSync(modules)) {
          if (!entry.startsWith(".vite"))
            symlinkSync(join(modules, entry), join(target, "node_modules", entry))
        }
      }
    }
    for (const file of ["package.json", "pnpm-workspace.yaml"])
      cpSync(join(root, file), join(scratch, file))
    symlinkSync(join(root, "node_modules"), join(scratch, "node_modules"))
    const app = join(scratch, "apps/web")
    const migrate = start(join(app, "node_modules/.bin/void"), ["db", "migrate"], app)
    const [migrationCode] = await once(migrate, "exit")
    await stop(migrate)
    if (migrationCode !== 0 || interrupted)
      throw new Error("Local migration failed; see server.log")

    const socket = createServer()
    socket.listen(0, "127.0.0.1")
    await once(socket, "listening")
    const port = socket.address().port
    await new Promise((done) => socket.close(done))
    const url = `http://127.0.0.1:${port}`
    result.url = url
    const server = start(
      join(app, "node_modules/.bin/vp"),
      ["dev", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
      app
    )
    result.serverPid = server.pid
    writeFileSync(
      join(evidence, "result.json"),
      JSON.stringify({ ...result, status: "running" }, null, 2)
    )
    const deadline = Date.now() + 120_000
    while (true) {
      if (interrupted || server.exitCode !== null || server.signalCode)
        throw new Error("Dev server stopped; see server.log")
      try {
        result.doctor = await doctor(url)
        break
      } catch (error) {
        if (Date.now() > deadline) throw error
        await delay(500)
      }
    }
    console.log(`Ready: ${url}`)
    const input = {
      url,
      evidence,
      screenshots: options.screenshots,
    }
    const browserLog = openSync(join(evidence, "browser.log"), "a")
    try {
      const browser = start(
        process.execPath,
        [join(root, "scripts/e2e-browser.js"), JSON.stringify(input)],
        root,
        browserLog
      )
      const [code] = await once(browser, "exit")
      await stop(browser)
      if (code !== 0 || interrupted)
        throw new Error("Browser verification failed; see browser.log and journey.json")
    } finally {
      closeSync(browserLog)
    }
    result.status = "passed"
  } catch (error) {
    result.error = error.message
    console.error(error.message)
  } finally {
    clearTimeout(watchdog)
    try {
      for (const child of children) await stop(child)
      rmSync(scratch, { recursive: true, force: true })
      result.cleaned = !existsSync(scratch)
    } catch (error) {
      result.status = "failed"
      result.cleanupError = error.message
    }
    closeSync(log)
    result.finishedAt = new Date().toISOString()
    writeFileSync(join(evidence, "result.json"), JSON.stringify(result, null, 2) + "\n")
    console.log(`${result.status}: ${join(evidence, "result.json")}`)
    process.exitCode = result.status === "passed" ? 0 : 1
  }
}
