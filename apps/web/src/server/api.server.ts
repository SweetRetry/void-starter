import { chatId } from "@/lib/chat"
import { problemResponse } from "./problem"

type Context = { request: Request; params: { chatId: string } }

/**
 * Wrap a `/api/chats/$chatId/*` handler: a malformed id answers 404, and an unexpected throw
 * still leaves as problem+json carrying the ray id.
 */
export function chatRoute(handler: (context: Context) => Promise<Response>) {
  return async (context: Context) => {
    if (!chatId.safeParse(context.params).success) {
      return problemResponse(context.request, "NOT_FOUND", "Chat not found.")
    }
    try {
      return await handler(context)
    } catch (error) {
      // An Error serializes to {} in Workers Logs; keep its name, message and stack.
      const cause =
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error
      console.error("api.failed", { path: new URL(context.request.url).pathname, error: cause })
      return problemResponse(
        context.request,
        "INTERNAL_SERVER_ERROR",
        "Something went wrong on our side."
      )
    }
  }
}
