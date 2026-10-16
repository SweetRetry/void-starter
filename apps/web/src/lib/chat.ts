import { z } from "zod"

import { MODELS } from "./models"

/** Limits the composer and the API share. */
export const MAX_FILES = 4
export const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_MESSAGE_CHARS = 8000

export const chatId = z.object({ chatId: z.uuid() })

const modelId = z.enum(MODELS.map((model) => model.id) as [string, ...string[]])

export const sendInput = z.object({
  content: z.string().trim().max(MAX_MESSAGE_CHARS),
  model: modelId,
})

export const regenerateInput = z.object({ model: modelId })

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
  content: string
  reasoning?: string
  files?: TurnFile[]
}

/** One of the visitor's chats, as the sidebar lists it. */
export interface Session {
  id: string
  title: string
}

export const fileUrl = (chat: string, file: string) => `/api/chats/${chat}/files/${file}`
