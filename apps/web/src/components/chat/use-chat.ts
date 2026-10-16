import { useRouter } from "@tanstack/react-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { readAiStream } from "@/lib/ai-stream"
import { problemDetail } from "@/lib/api-problem"
import { chatPaths, sendInput, sendProblem } from "@/lib/chat"
import type { ChatFile, ChatTurn, Turn } from "@/lib/chat"
import { DEFAULT_MODEL, MODELS } from "@/lib/models"

/**
 * The transport behind `ChatApp`. A send posts the turn and its files, then reads the answer's
 * SSE stream into the last turn; the server saves both, so a reload shows the same thread.
 */
export function useChat(chatId: string, saved: Turn[], savedModel?: string) {
  const router = useRouter()
  const [turns, setTurns] = useState<ChatTurn[]>(saved)
  const [streaming, setStreaming] = useState(false)
  // A chat reopens on the model that wrote its last answer.
  const [model, setModel] = useState<string>(
    MODELS.some((option) => option.id === savedModel) ? savedModel! : DEFAULT_MODEL
  )
  const abort = useRef<AbortController | null>(null)

  useEffect(() => () => abort.current?.abort(), [])

  /** The reasoning is over: freeze its count, once. */
  const thought = (turn: ChatTurn): Partial<ChatTurn> =>
    turn.reasoning === undefined || turn.thoughtFor !== undefined || turn.startedAt === undefined
      ? {}
      : { thoughtFor: Math.max(0, Math.floor((Date.now() - turn.startedAt) / 1000)) }

  const patch = (id: string, change: (turn: ChatTurn) => Partial<ChatTurn>) =>
    setTurns((current) =>
      current.map((turn) => (turn.id === id ? { ...turn, ...change(turn) } : turn))
    )

  /** Post, then stream the answer into the turn `answerId`. False when nothing was sent. */
  const run = useCallback(async (answerId: string, request: () => Promise<Response>) => {
    const controller = new AbortController()
    abort.current = controller
    setStreaming(true)
    try {
      const response = await request()
      if (!response.ok || !response.body) {
        toast.error(await problemDetail(response, "The message wasn't sent. Try again."))
        return false
      }
      for await (const event of readAiStream(response.body)) {
        if (event.type === "delta")
          patch(answerId, (turn) => ({ content: turn.content + event.text, ...thought(turn) }))
        else if (event.type === "reasoning")
          patch(answerId, (turn) => ({ reasoning: (turn.reasoning ?? "") + event.text }))
        else if (event.type === "limit" || event.type === "error") toast.error(event.message)
      }
      return true
    } catch (error) {
      if (controller.signal.aborted) return true
      toast.error("The connection dropped. Try again.")
      console.error("chat.stream_failed", error)
      return true
    } finally {
      patch(answerId, (turn) => ({ streaming: false, ...thought(turn) }))
      setStreaming(false)
      abort.current = null
    }
  }, [])

  const onSend = useCallback(
    async (content: string, files: ChatFile[]) => {
      const uploads = files.flatMap((file) => (file.file ? [file.file] : []))
      const input = sendInput.safeParse({ content, model, files: uploads })
      if (!input.success) return toast.error(sendProblem(input.error).detail)

      const userId = crypto.randomUUID()
      const answerId = crypto.randomUUID()
      setTurns((current) => [
        ...current,
        { id: userId, from: "user", content, files },
        { id: answerId, from: "assistant", content: "", streaming: true, startedAt: Date.now() },
      ])

      const body = new FormData()
      body.set("content", content)
      body.set("model", model)
      for (const file of uploads) body.append("files", file)
      const sent = await run(answerId, () =>
        fetch(chatPaths.messages(chatId), {
          method: "POST",
          body,
          signal: abort.current?.signal,
        })
      )
      // Nothing reached the server: take the turn back so the thread matches what is saved.
      // Otherwise the chat exists now, so reload the sidebar's session list.
      if (sent) void router.invalidate()
      else
        setTurns((current) => current.filter((turn) => turn.id !== userId && turn.id !== answerId))
    },
    [chatId, model, router, run]
  )

  const onRetry = useCallback(
    async (id: string) => {
      const answerId = crypto.randomUUID()
      setTurns((current) => [
        ...current.filter((turn) => turn.id !== id),
        { id: answerId, from: "assistant", content: "", streaming: true, startedAt: Date.now() },
      ])
      await run(answerId, () =>
        fetch(chatPaths.answer(chatId), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model }),
          signal: abort.current?.signal,
        })
      )
    },
    [chatId, model, run]
  )

  const onStop = useCallback(() => abort.current?.abort(), [])

  return {
    model,
    models: [...MODELS],
    onModelChange: setModel,
    onRetry,
    onSend,
    onStop,
    streaming,
    turns,
  }
}
