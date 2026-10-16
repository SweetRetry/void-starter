import { z } from "zod"

/** One schema per input, shared by the server function validator and the react-hook-form resolver. */
export const noteInput = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the note a title.")
    .max(120, "Keep the title under 120 characters."),
  body: z.string().max(20_000, "Keep the note under 20,000 characters."),
})

export type NoteInput = z.infer<typeof noteInput>

export const noteId = z.object({ id: z.uuid() })

/** R2 attachments: what a note accepts and how large it may be. */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
] as const
