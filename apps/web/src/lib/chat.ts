import { z } from "zod"

import { validationError } from "./api"
import { MODELS } from "./models"

/** Limits the composer and the API share. Every message that names one is built from it. */
export const MAX_FILES = 4
const MAX_FILE_MB = 5
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024
const MAX_MESSAGE_CHARS = 8000

export const chatId = z.object({ chatId: z.uuid() })

const modelId = z.enum(MODELS.map((model) => model.id) as [string, ...string[]], {
  error: "Pick a model.",
})

/**
 * A user turn, as the composer checks it before sending and the API checks it on arrival.
 * Each check carries the sentence the person sees; a wrong type (a client that isn't the
 * composer) gets the one from `sendError`.
 */
export const sendInput = z
  .object({
    content: z
      .string()
      .trim()
      .max(
        MAX_MESSAGE_CHARS,
        `Keep the message under ${MAX_MESSAGE_CHARS.toLocaleString("en")} characters.`
      ),
    model: modelId,
    files: z
      .array(
        z
          .file()
          .min(1, "Files can't be empty.")
          .max(MAX_FILE_BYTES, `Files can be up to ${MAX_FILE_MB} MB each.`)
      )
      .max(MAX_FILES, `Attach up to ${MAX_FILES} files.`),
  })
  .refine((input) => input.content || input.files.length > 0, {
    error: "Write a message or attach a file.",
  })

/** A failed `sendInput` as the API's validation error, which the composer shows too. */
export const sendError = (error: z.ZodError) =>
  validationError(error, "Send the message as form data.")

export const regenerateInput = z.object({ model: modelId })

/** Whether the browser can draw a file as an image, so its chip previews and it serves inline. */
export const isPreviewableImage = (type: string) => /^image\/(png|jpeg|gif|webp|avif)$/.test(type)

/** A file on a turn, as the thread renders it. `src` is set for images, so the chip previews. */
interface TurnFile {
  id: string
  name: string
  src?: string
}

/** A saved turn, as the loader hands it to the page. */
export interface Turn {
  id: string
  from: "user" | "assistant"
  /** The answer, as Markdown. Empty while the turn is still thinking. */
  content: string
  /** The reasoning the answer was written from, when the model exposed one. */
  reasoning?: string
  files?: TurnFile[]
}

/** A file on a turn in the browser: on the way out of the composer it still holds the bytes. */
export interface ChatFile extends TurnFile {
  file?: File
}

/** A turn in the browser: a saved one, or one still arriving. */
export interface ChatTurn extends Turn {
  /** Epoch ms the pass started, so the thinking block's clock survives a re-render. */
  startedAt?: number
  /** Whole seconds the model reasoned before it answered, once it has. */
  thoughtFor?: number
  streaming?: boolean
  files?: ChatFile[]
}

/** One of the visitor's chats, as the sidebar lists it. */
export interface Session {
  id: string
  title: string
}

export const chatPaths = {
  messages: (chat: string) => `/api/chats/${chat}/messages`,
  answer: (chat: string) => `/api/chats/${chat}/answer`,
  file: (chat: string, file: string) => `/api/chats/${chat}/files/${file}`,
}
