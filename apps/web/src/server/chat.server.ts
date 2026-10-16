import { waitUntil } from "cloudflare:workers"
import { ai } from "void/ai"
import { asc, db, desc, eq } from "void/db"
import { UsageLimit } from "void/limits"
import { storage } from "void/storage"

import { attachment, chat, message } from "../../db/schema"
import { createAiStreamParser } from "@/lib/ai-stream"
import { fileUrl, type Turn } from "@/lib/chat"
import { AI_GATEWAY_ID, FILE_TEXT_CHARS, HISTORY_TURNS, SYSTEM_PROMPT } from "./ai"
import { problemResponse } from "./problem"

/**
 * The thread as the page renders it, oldest first, and the model that wrote the last answer.
 * An unknown id is an empty, new chat.
 */
export async function loadChat(chatId: string): Promise<{ turns: Turn[]; model?: string }> {
  const [messages, files] = await Promise.all([
    db.select().from(message).where(eq(message.chatId, chatId)).orderBy(asc(message.createdAt)),
    db
      .select({
        id: attachment.id,
        messageId: attachment.messageId,
        name: attachment.name,
        type: attachment.type,
      })
      .from(attachment)
      .where(eq(attachment.chatId, chatId)),
  ])
  const turns = messages.map((row): Turn => {
    const own = files.filter((file) => file.messageId === row.id)
    return {
      id: row.id,
      from: row.role,
      content: row.content,
      ...(row.reasoning && { reasoning: row.reasoning }),
      ...(own.length > 0 && {
        files: own.map((file) => ({
          id: file.id,
          name: file.name,
          ...(file.type.startsWith("image/") && { src: fileUrl(chatId, file.id) }),
        })),
      }),
    }
  })
  const model = messages.filter((row) => row.model).at(-1)?.model ?? undefined
  return { turns, ...(model && { model }) }
}

const TEXT_TYPES = /^text\/|^application\/(json|xml|x-yaml|yaml|toml)$/

/** What the model reads of a file: the text itself, or Markdown from `ai.toMarkdown()`. */
async function readable(file: File, bytes: ArrayBuffer): Promise<string | null> {
  if (TEXT_TYPES.test(file.type)) return new TextDecoder().decode(bytes)
  try {
    const result = await ai.toMarkdown({
      name: file.name,
      blob: new Blob([bytes], { type: file.type }),
    })
    return result.format === "error" ? null : result.data
  } catch (error) {
    console.warn("chat.to_markdown_failed", {
      name: file.name,
      type: file.type,
      error: String(error),
    })
    return null
  }
}

/** Save a user turn: the chat row on first use, the message, and each file in R2. */
export async function saveUserTurn(chatId: string, content: string, files: File[]) {
  await db.insert(chat).values({ id: chatId }).onConflictDoNothing()
  const messageId = crypto.randomUUID()
  await db.insert(message).values({ id: messageId, chatId, role: "user", content })

  const rows = await Promise.all(
    files.map(async (file) => {
      const id = crypto.randomUUID()
      const key = `chats/${chatId}/${id}`
      const bytes = await file.arrayBuffer()
      const type = file.type || "application/octet-stream"
      const [, text] = await Promise.all([
        storage.put(key, bytes, { httpMetadata: { contentType: type } }),
        readable(file, bytes),
      ])
      return { id, messageId, chatId, key, name: file.name, type, size: file.size, text }
    })
  )
  if (rows.length > 0) await db.insert(attachment).values(rows)
}

/** Remove the answers after the last user turn, so a regenerate starts from that turn. */
export async function dropTrailingAnswers(chatId: string): Promise<boolean> {
  const recent = await db
    .select({ id: message.id, role: message.role })
    .from(message)
    .where(eq(message.chatId, chatId))
    .orderBy(desc(message.createdAt))
    .limit(HISTORY_TURNS)
  const lastUser = recent.findIndex((row) => row.role === "user")
  if (lastUser === -1) return false
  for (const row of recent.slice(0, lastUser))
    await db.delete(message).where(eq(message.id, row.id))
  return true
}

async function promptFor(chatId: string) {
  const [recent, files] = await Promise.all([
    db
      .select()
      .from(message)
      .where(eq(message.chatId, chatId))
      .orderBy(desc(message.createdAt))
      .limit(HISTORY_TURNS),
    db
      .select({ messageId: attachment.messageId, name: attachment.name, text: attachment.text })
      .from(attachment)
      .where(eq(attachment.chatId, chatId)),
  ])
  const turns = recent.reverse().map((row) => {
    const attached = files
      .filter((file) => file.messageId === row.id)
      .map((file) =>
        file.text === null
          ? `<file name="${file.name}">This file could not be read.</file>`
          : `<file name="${file.name}">\n${file.text.slice(0, FILE_TEXT_CHARS)}\n</file>`
      )
    return {
      role: row.role,
      content: [row.content, ...attached].filter(Boolean).join("\n\n"),
    }
  })
  return {
    messages: [{ role: "system" as const, content: SYSTEM_PROMPT }, ...turns],
    lastId: recent.at(0)?.id,
  }
}

/**
 * Stream an answer to the chat's latest user turn as SSE through AI Gateway. The browser renders
 * the stream; a copy is read here and saved once it finishes, unless a newer turn landed first.
 */
export async function streamAnswer(request: Request, chatId: string, model: string) {
  const { messages, lastId } = await promptFor(chatId)

  let stream: Response
  try {
    stream = await ai.stream(
      model,
      { messages, max_tokens: 2048 },
      { gateway: { id: AI_GATEWAY_ID } }
    )
  } catch (error) {
    // Void binds Workers AI only once the clone is connected to Cloudflare.
    if (error instanceof Error && error.message.startsWith("ai: Not available")) {
      return problemResponse(
        request,
        "SERVICE_UNAVAILABLE",
        "AI isn't connected yet. Run `pnpm connect`, then restart `pnpm dev`."
      )
    }
    // Workers AI refuses a gateway id the account hasn't created (AiGatewayError 2001).
    if (error instanceof Error && error.message.includes("Please configure AI Gateway")) {
      return problemResponse(
        request,
        "SERVICE_UNAVAILABLE",
        `AI Gateway "${AI_GATEWAY_ID}" doesn't exist yet. Create it in the Cloudflare dashboard under AI › AI Gateway.`
      )
    }
    if (!(error instanceof UsageLimit)) throw error
    const retryAt = error.retryAt ? Date.parse(error.retryAt) : Number.NaN
    return problemResponse(request, "TOO_MANY_REQUESTS", "AI is busy. Try again shortly.", {
      ...(Number.isFinite(retryAt) && {
        headers: { "retry-after": String(Math.max(1, Math.ceil((retryAt - Date.now()) / 1000))) },
        extensions: { retryAt: error.retryAt },
      }),
    })
  }

  const [toBrowser, toSave] = stream.body!.tee()
  waitUntil(saveAnswer(chatId, model, lastId, toSave))
  return new Response(toBrowser, { headers: stream.headers })
}

async function saveAnswer(
  chatId: string,
  model: string,
  after: string | undefined,
  body: ReadableStream<Uint8Array>
) {
  const parser = createAiStreamParser()
  const decoder = new TextDecoder()
  let content = ""
  let reasoning = ""
  let finished = false
  const take = (events: ReturnType<typeof parser.push>) => {
    for (const event of events) {
      if (event.type === "delta") content += event.text
      else if (event.type === "reasoning") reasoning += event.text
      else if (event.type === "done") finished = true
      else return false // limit or error: nothing worth saving
    }
    return true
  }
  for await (const chunk of body) {
    if (!take(parser.push(decoder.decode(chunk, { stream: true })))) return
  }
  if (!take(parser.end()) || !finished || !content.trim()) return

  // A regenerate or a newer message may have moved the thread on while this one streamed.
  const [latest] = await db
    .select({ id: message.id })
    .from(message)
    .where(eq(message.chatId, chatId))
    .orderBy(desc(message.createdAt))
    .limit(1)
  if (latest?.id !== after) return

  await db.insert(message).values({
    id: crypto.randomUUID(),
    chatId,
    role: "assistant",
    content: content.trim(),
    reasoning: reasoning.trim() || null,
    model,
  })
}
