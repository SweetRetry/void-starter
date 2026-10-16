import { Button } from "@workspace/ui/components/button"
import { useState } from "react"
import { toast } from "sonner"

import { createAiStreamParser } from "@/lib/ai-stream"
import { problemDetail } from "@/lib/api-problem"

interface NoteSummaryProps {
  noteId: string
  saved: string | null
  canSummarize: boolean
}

type SummaryState =
  | { status: "idle" }
  | { status: "streaming"; text: string }
  | { status: "interrupted"; text: string }

/**
 * Streams a summary from /api/notes/$noteId/summary. Tokens render as they arrive; if the
 * stream is cut off, the partial text stays and the button offers to try again.
 */
export function NoteSummary({ noteId, saved, canSummarize }: NoteSummaryProps) {
  const [state, setState] = useState<SummaryState>({ status: "idle" })
  const [latest, setLatest] = useState<string | null>(null)

  async function summarize() {
    setState({ status: "streaming", text: "" })
    let text = ""
    const stop = (message: string) => {
      setState({ status: "interrupted", text })
      toast.error(message)
    }

    const response = await fetch(`/api/notes/${noteId}/summary`, { method: "POST" }).catch(
      () => null
    )
    if (!response?.ok || !response.body) {
      stop(
        response
          ? await problemDetail(response, "The summary didn't start. Try again.")
          : "You're offline. Reconnect and try again."
      )
      return
    }

    const parser = createAiStreamParser()
    const decoder = new TextDecoder()
    const reader = response.body.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        const events = done ? parser.end() : parser.push(decoder.decode(value, { stream: true }))
        for (const event of events) {
          if (event.type === "delta") {
            text += event.text
            setState({ status: "streaming", text })
          } else if (event.type === "limit" || event.type === "error") {
            stop(`${event.message} The text so far is kept.`)
            return
          }
        }
        if (done) break
      }
    } catch {
      stop("The connection dropped. The text so far is kept.")
      return
    }
    // The server saves the finished summary; keep showing it here until the next load.
    setState({ status: "idle" })
    setLatest(text.trim())
  }

  const shown = state.status === "idle" ? (latest ?? saved) : state.text

  return (
    <section aria-labelledby="summary-heading">
      <div className="flex items-center gap-2">
        <h2 id="summary-heading" className="text-sm font-medium">
          Summary
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          disabled={!canSummarize || state.status === "streaming"}
          onClick={summarize}
        >
          {state.status === "streaming"
            ? "Summarizing…"
            : state.status === "interrupted"
              ? "Try again"
              : shown
                ? "Summarize again"
                : "Summarize"}
        </Button>
      </div>
      <p aria-live="polite" className="mt-2 text-sm text-pretty text-muted-foreground">
        {shown || (canSummarize ? "No summary yet." : "Write something, save it, then summarize.")}
      </p>
    </section>
  )
}
