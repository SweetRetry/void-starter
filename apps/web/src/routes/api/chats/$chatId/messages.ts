import { createFileRoute } from "@tanstack/react-router"

import { MAX_FILE_BYTES, MAX_FILES, sendInput } from "@/lib/chat"
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
      POST: chatRoute(async ({ request, params, visitor }) => {
        const declared = Number(request.headers.get("content-length") ?? 0)
        if (declared > MAX_FILES * MAX_FILE_BYTES + 64 * 1024) {
          return problemResponse(request, "PAYLOAD_TOO_LARGE", "Files can be up to 5 MB each.")
        }
        const form = await request.formData().catch(() => null)
        if (!form)
          return problemResponse(request, "VALIDATION_ERROR", "Send the message as form data.")

        const input = sendInput.safeParse({
          content: form.get("content"),
          model: form.get("model"),
        })
        if (!input.success) {
          return problemResponse(
            request,
            "VALIDATION_ERROR",
            "Pick a model and keep the message under 8,000 characters."
          )
        }
        const files = form.getAll("files").filter((value): value is File => value instanceof File)
        if (!input.data.content && files.length === 0) {
          return problemResponse(request, "VALIDATION_ERROR", "Write a message or attach a file.")
        }
        if (files.length > MAX_FILES) {
          return problemResponse(request, "VALIDATION_ERROR", `Attach up to ${MAX_FILES} files.`)
        }
        if (files.some((file) => file.size === 0 || file.size > MAX_FILE_BYTES)) {
          return problemResponse(
            request,
            "PAYLOAD_TOO_LARGE",
            "Files can be up to 5 MB each, and not empty."
          )
        }

        await saveUserTurn(params.chatId, visitor, input.data.content, files)
        return streamAnswer(request, params.chatId, input.data.model)
      }),
    },
  },
})
