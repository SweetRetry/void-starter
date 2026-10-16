import { createFileRoute } from "@tanstack/react-router"

import { chatId, regenerateInput } from "@/lib/chat"
import { chatRoute } from "@/server/api.server"
import { dropTrailingAnswers, streamAnswer } from "@/server/chat.server"
import { problemResponse } from "@/server/problem"

/** POST `{ model }` to answer the latest user turn again. The previous answer is replaced. */
export const Route = createFileRoute("/api/chats/$chatId/answer")({
  server: {
    handlers: {
      POST: chatRoute(chatId, async ({ request, params, access }) => {
        const input = regenerateInput.safeParse(await request.json().catch(() => null))
        if (!input.success) return problemResponse(request, "VALIDATION_ERROR", "Pick a model.")
        if (access === "new" || !(await dropTrailingAnswers(params.chatId))) {
          return problemResponse(request, "NOT_FOUND", "There's no message to answer.")
        }
        return streamAnswer(request, params.chatId, input.data.model)
      }),
    },
  },
})
