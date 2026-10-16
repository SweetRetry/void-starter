/**
 * Playwright journey implementation, invoked by scripts/e2e.js with a JSON argument.
 * Records actions, snapshots and optional screenshots in the evidence directory.
 * Throws on a failed expectation. No AI requests or production writes are made.
 */
import assert from "node:assert/strict"
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { chromium } from "playwright"

async function drive({ url, evidence, screenshots }) {
  const steps = []
  const report = { status: "failed", screenshots, steps }
  let browser
  let page
  async function step(name, action) {
    const record = { name, status: "started", at: new Date().toISOString() }
    steps.push(record)
    await action()
    record.status = "passed"
    await writeFile(
      join(evidence, `${steps.length}.txt`),
      await page.locator("body").ariaSnapshot()
    )
    if (screenshots) await page.screenshot({ path: join(evidence, `${steps.length}.png`) })
  }
  async function heading(expected) {
    await page.waitForFunction(
      (text) => document.querySelector("main h1")?.textContent === text,
      expected,
      { timeout: 15_000 }
    )
  }
  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    page = await context.newPage()
    page.setDefaultTimeout(15_000)
    page.on("pageerror", (error) => console.error(error))
    await step("Open the overview", async () => {
      await page.goto(url)
      await heading("Void Starter")
    })
    await step("Switch the overview to Chinese", async () => {
      await page.click('a[aria-label="Switch to Chinese"]')
      await page.waitForSelector('a[aria-label="Switch to English"]', { state: "visible" })
      await heading("Void Starter")
      assert.equal(new URL(await page.url()).pathname, "/zh/cloud")
      assert.ok(
        await page.evaluate(() =>
          document.querySelector("main").textContent.includes("全栈 TypeScript 模板仓库")
        )
      )
    })
    await step("Navigate to the Chinese tooling article", async () => {
      await page.click('nav[aria-label="Articles"] a[href="/zh/harness"]')
      await heading("Void Starter 的工程护栏、工具链与设计系统")
    })
    await step("Switch the tooling article to English and reload", async () => {
      await page.click('a[aria-label="Switch to English"]')
      await heading("Tooling, UI and guardrails in Void Starter")
      assert.equal(new URL(await page.url()).pathname, "/en/harness")
      await page.reload()
      await heading("Tooling, UI and guardrails in Void Starter")
    })
    await step("Open Playground with an empty migrated database", async () => {
      await page.click('header a[href="/chat"]')
      await page.waitForSelector('textarea[placeholder="Ask anything, or drop in a file."]', {
        state: "visible",
      })
      assert.match(new URL(await page.url()).pathname, /^\/c\/[\da-f-]{36}$/)
      assert.equal(
        await page.evaluate(
          () => document.querySelector('button[aria-label="Send message"]').disabled
        ),
        true
      )
    })
    await step("Type a draft and enable Send", async () => {
      await page.fill(
        'textarea[placeholder="Ask anything, or drop in a file."]',
        "Verification draft"
      )
      await page.waitForFunction(
        () => !document.querySelector('button[aria-label="Send message"]').disabled,
        undefined,
        { timeout: 5000 }
      )
      assert.equal(
        await page.evaluate(() => document.querySelector("textarea").value),
        "Verification draft"
      )
    })
    await step("Clear the draft and disable Send", async () => {
      await page.fill("textarea", "")
      await page.waitForFunction(
        () => document.querySelector('button[aria-label="Send message"]').disabled,
        undefined,
        { timeout: 5000 }
      )
    })
    report.status = "passed"
  } catch (error) {
    report.error = error.message
    try {
      if (page) {
        await writeFile(join(evidence, "failure.txt"), await page.locator("body").ariaSnapshot())
        if (screenshots) await page.screenshot({ path: join(evidence, "failure.png") })
      }
    } catch (captureError) {
      report.captureError = captureError.message
    }
    throw error
  } finally {
    try {
      await browser?.close()
    } catch (error) {
      report.status = "failed"
      report.cleanupError = error.message
      // Fail the run without masking a journey error already in flight.
      process.exitCode = 1
    } finally {
      await writeFile(join(evidence, "journey.json"), JSON.stringify(report, null, 2) + "\n")
    }
  }
}

await drive(JSON.parse(process.argv[2]))
