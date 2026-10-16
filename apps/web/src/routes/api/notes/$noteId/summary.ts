import { createFileRoute } from "@tanstack/react-router"
import { waitUntil } from "cloudflare:workers"
import { db, eq } from "void/db"
import { ai } from "void/ai"
import { UsageLimit } from "void/limits"

import { note } from "../../../../../db/schema"
import { createAiStreamParser } from "@/lib/ai-stream"
import { AI_GATEWAY_ID, SUMMARY_MODEL, summaryMessages } from "@/server/ai"
import { ownNoteOrProblem, withProblems } from "@/server/api.server"
import { problemResponse } from "@/server/problem"

/**
 * POST streams a summary of the note as SSE through AI Gateway. The browser renders the
 * stream; a copy is read here and saved to the note once it finishes cleanly.
 */
export const Route = createFileRoute("/api/notes/$noteId/summary")({
  server: {
    handlers: {
      POST: withProblems(async ({ request, params }) => {
        const row = await ownNoteOrProblem(request, params.noteId)
        if (row instanceof Response) return row
        if (!row.body.trim()) {
          return problemResponse(request, "VALIDATION_ERROR", "Write something in the note first.")
        }

        let stream: Response
        try {
          stream = await ai.stream(
            SUMMARY_MODEL,
            { messages: summaryMessages(row.title, row.body), max_tokens: 256 },
            { gateway: { id: AI_GATEWAY_ID } }
          )
        } catch (error) {
          // Void binds Workers AI only once the clone is connected to Cloudflare.
          if (error instanceof Error && error.message.startsWith("ai: Not available")) {
            return problemResponse(
              request,
              "SERVICE_UNAVAILABLE",
              "AI isn't connected yet. Run `pnpm connect`, then restart `pnpm dev`."
            )
          }
          // Workers AI refuses a gateway id the account hasn't created (AiGatewayError 2001).
          if (error instanceof Error && error.message.includes("Please configure AI Gateway")) {
            return problemResponse(
              request,
              "SERVICE_UNAVAILABLE",
              `AI Gateway "${AI_GATEWAY_ID}" doesn't exist yet. Create it in the Cloudflare dashboard under AI › AI Gateway.`
            )
          }
          if (!(error instanceof UsageLimit)) throw error
          const retryAt = error.retryAt ? Date.parse(error.retryAt) : Number.NaN
          return problemResponse(request, "TOO_MANY_REQUESTS", "AI is busy. Try again shortly.", {
            ...(Number.isFinite(retryAt) && {
              headers: {
                "retry-after": String(Math.max(1, Math.ceil((retryAt - Date.now()) / 1000))),
              },
              extensions: { retryAt: error.retryAt },
            }),
          })
        }

        const [toBrowser, toSave] = stream.body!.tee()
        waitUntil(saveSummary(row.id, toSave))
        return new Response(toBrowser, { headers: stream.headers })
      }),
    },
  },
})

async function saveSummary(id: string, body: ReadableStream<Uint8Array>) {
  const parser = createAiStreamParser()
  const decoder = new TextDecoder()
  let text = ""
  let finished = false
  for await (const chunk of body) {
    for (const event of parser.push(decoder.decode(chunk, { stream: true }))) {
      if (event.type === "delta") text += event.text
      else if (event.type === "done") finished = true
      else return // limit or error: keep the previous summary
    }
  }
  for (const event of parser.end()) if (event.type === "done") finished = true
  if (finished && text.trim())
    await db.update(note).set({ summary: text.trim() }).where(eq(note.id, id))
}
