import { and, db, eq } from "void/db"

import { note } from "../../db/schema"
import { noteId } from "../lib/note-input"
import { getAuth } from "./auth.server"
import { problemResponse } from "./problem"

export type Note = typeof note.$inferSelect

/**
 * Shared guard for `/api/notes/$noteId/*` routes: the caller's own note, or the problem
 * response to send instead (401 signed out, 404 for a malformed id, a missing note or
 * someone else's note).
 */
export async function ownNoteOrProblem(request: Request, id: string): Promise<Note | Response> {
  const session = await getAuth().api.getSession({ headers: request.headers })
  if (!session) return problemResponse(request, "UNAUTHORIZED", "Sign in to use this endpoint.")

  if (!noteId.safeParse({ id }).success) {
    return problemResponse(request, "NOT_FOUND", "Note not found.")
  }
  const [row] = await db
    .select()
    .from(note)
    .where(and(eq(note.id, id), eq(note.userId, session.user.id)))
  return row ?? problemResponse(request, "NOT_FOUND", "Note not found.")
}

/** Wrap a handler so an unexpected throw still leaves as problem+json carrying the ray id. */
export function withProblems(
  handler: (context: { request: Request; params: { noteId: string } }) => Promise<Response>
) {
  return async (context: { request: Request; params: { noteId: string } }) => {
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
