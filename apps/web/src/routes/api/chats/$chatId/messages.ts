import { createFileRoute } from "@tanstack/react-router"

import { chatId, MAX_FILE_BYTES, MAX_FILES, sendInput, sendProblem } from "@/lib/chat"
import { chatRoute } from "@/server/api.server"
import { saveUserTurn, streamAnswer } from "@/server/chat.server"
import { problemResponse } from "@/server/problem"

/**
 * POST a user turn as multipart form data (`content`, `model`, up to four `files`). Files go to
 * R2, the turn to D1, and the answer streams back as SSE.
 */
export const Route = createFileRoute("/api/chats/$chatId/messages")({
  server: {
    handlers: {
      POST: chatRoute(chatId, async ({ request, params, visitor }) => {
        // Refuse an oversized body before reading it.
        const declared = Number(request.headers.get("content-length") ?? 0)
        if (declared > MAX_FILES * MAX_FILE_BYTES + 64 * 1024) {
          return problemResponse(request, "PAYLOAD_TOO_LARGE", "The message is too large to send.")
        }
        const form = await request.formData().catch(() => null)
        if (!form)
          return problemResponse(request, "VALIDATION_ERROR", "Send the message as form data.")

        const input = sendInput.safeParse({
          content: form.get("content"),
          model: form.get("model"),
          files: form.getAll("files"),
        })
        if (!input.success) {
          const { tooLarge, detail } = sendProblem(input.error)
          return problemResponse(
            request,
            tooLarge ? "PAYLOAD_TOO_LARGE" : "VALIDATION_ERROR",
            detail
          )
        }

        const { content, model, files } = input.data
        await saveUserTurn(params.chatId, visitor, content, files)
        return streamAnswer(request, params.chatId, model)
      }),
    },
  },
})
