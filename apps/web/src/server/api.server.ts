import type { z } from "zod"

import type { chatId } from "@/lib/chat"
import { chatAccess } from "./chat.server"
import { problemResponse } from "./problem"
import { currentVisitor } from "./visitor.server"

type ChatContext<Params> = {
  request: Request
  params: Params
  visitor: string
  access: "new" | "own"
}

/**
 * Wrap a `/api/chats/$chatId/*` handler. `params` parses the path; a malformed id answers 404,
 * like someone else's chat. It answers 400 without a visitor cookie, and an unexpected throw
 * still leaves as problem+json carrying the ray id.
 */
export function chatRoute<Params extends z.output<typeof chatId>>(
  params: z.ZodType<Params>,
  handler: (context: ChatContext<Params>) => Promise<Response>
) {
  return async ({ request, params: raw }: { request: Request; params: unknown }) => {
    const parsed = params.safeParse(raw)
    if (!parsed.success) return problemResponse(request, "NOT_FOUND", "Not found.")
    try {
      const visitor = currentVisitor()
      if (!visitor) {
        return problemResponse(request, "VALIDATION_ERROR", "Reload the page to start a session.")
      }
      const access = await chatAccess(parsed.data.chatId, visitor)
      if (access === "other") return problemResponse(request, "NOT_FOUND", "Chat not found.")
      return await handler({ request, params: parsed.data, visitor, access })
    } catch (error) {
      // An Error serializes to {} in Workers Logs; keep its name, message and stack.
      const cause =
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error
      console.error("api.failed", { path: new URL(request.url).pathname, error: cause })
      return problemResponse(request, "INTERNAL_SERVER_ERROR", "Something went wrong on our side.")
    }
  }
}
