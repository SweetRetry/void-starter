import { chatId } from "@/lib/chat"
import { chatAccess } from "./chat.server"
import { problemResponse } from "./problem"
import { currentVisitor } from "./visitor.server"

type Context = { request: Request; params: { chatId: string } }
type ChatContext = Context & { visitor: string; access: "new" | "own" }

/**
 * Wrap a `/api/chats/$chatId/*` handler. It answers 404 for a malformed id or someone else's
 * chat, 400 without a visitor cookie, and an unexpected throw still leaves as problem+json
 * carrying the ray id.
 */
export function chatRoute(handler: (context: ChatContext) => Promise<Response>) {
  return async (context: Context) => {
    const { request, params } = context
    if (!chatId.safeParse(params).success) {
      return problemResponse(request, "NOT_FOUND", "Chat not found.")
    }
    try {
      const visitor = currentVisitor()
      if (!visitor) {
        return problemResponse(request, "VALIDATION_ERROR", "Reload the page to start a session.")
      }
      const access = await chatAccess(params.chatId, visitor)
      if (access === "other") return problemResponse(request, "NOT_FOUND", "Chat not found.")
      return await handler({ ...context, visitor, access })
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
