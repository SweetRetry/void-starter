import { createFileRoute } from "@tanstack/react-router"

import { validationError } from "@/lib/api"
import { chatId, regenerateInput } from "@/lib/chat"
import { chatRoute } from "@/server/api.server"
import { dropTrailingAnswers, streamAnswer } from "@/server/chat.server"
import { errorResponse } from "@/server/error-response"

/** POST `{ model }` to answer the latest user turn again. The previous answer is replaced. */
export const Route = createFileRoute("/api/chats/$chatId/answer")({
  server: {
    handlers: {
      POST: chatRoute(chatId, async ({ request, params, access }) => {
        const input = regenerateInput.safeParse(await request.json().catch(() => null))
        if (!input.success) return errorResponse(validationError(input.error, "Pick a model."))
        if (access === "new" || !(await dropTrailingAnswers(params.chatId))) {
          return errorResponse({ code: "NOT_FOUND", message: "There's no message to answer." })
        }
        return streamAnswer(params.chatId, input.data.model)
      }),
    },
  },
})
