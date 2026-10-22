import type { z } from "zod"

import type { chatId } from "@/lib/chat"
import { chatAccess } from "./chat.server"
import { errorResponse } from "./error-response"
import { currentVisitor } from "./visitor.server"

type ChatContext<Params> = {
  request: Request
  params: Params
  visitor: string
  access: "new" | "own"
}

/**
 * Wrap a `/api/chats/$chatId/*` handler. `params` parses the path; a malformed id answers 404,
 * like someone else's chat. It answers 401 without a visitor cookie, and an unexpected throw
 * answers 500 with a `traceId` that the `api.failed` log carries too.
 */
export function chatRoute<Params extends z.output<typeof chatId>>(
  params: z.ZodType<Params>,
  handler: (context: ChatContext<Params>) => Promise<Response>
) {
  return async ({ request, params: raw }: { request: Request; params: unknown }) => {
    const parsed = params.safeParse(raw)
    if (!parsed.success) return errorResponse({ code: "NOT_FOUND", message: "Not found." })
    try {
      const visitor = currentVisitor()
      if (!visitor) {
        return errorResponse({
          code: "UNAUTHORIZED",
          message: "Reload the page to start a session.",
        })
      }
      const access = await chatAccess(parsed.data.chatId, visitor)
      if (access === "other")
        return errorResponse({ code: "NOT_FOUND", message: "Chat not found." })
      return await handler({ request, params: parsed.data, visitor, access })
    } catch (error) {
      // An Error serializes to {} in Workers Logs; keep its name, message and stack.
      const cause =
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error
      // The edge's ray id when there is one, so Workers Logs finds the request by it.
      const traceId = request.headers.get("cf-ray") ?? crypto.randomUUID()
      console.error("api.failed", { traceId, path: new URL(request.url).pathname, error: cause })
      return errorResponse({
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong on our side.",
        traceId,
      })
    }
  }
}
