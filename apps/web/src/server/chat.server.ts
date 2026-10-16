import { waitUntil } from "cloudflare:workers"
import { ai } from "void/ai"
import { and, asc, db, desc, eq, gt } from "void/db"
import { UsageLimit } from "void/limits"
import { storage } from "void/storage"

import { attachment, chat, message } from "../../db/schema"
import { readAiStream } from "@/lib/ai-stream"
import { chatPaths, isPreviewableImage, type Session, type Turn } from "@/lib/chat"
import { AI_GATEWAY_ID, FILE_TEXT_CHARS, HISTORY_TURNS, SYSTEM_PROMPT } from "./ai"
import { problemResponse } from "./problem"

/** Whether a chat id is free, the visitor's own, or someone else's. */
export async function chatAccess(chatId: string, visitor: string) {
  const [row] = await db.select({ visitorId: chat.visitorId }).from(chat).where(eq(chat.id, chatId))
  return !row ? "new" : row.visitorId === visitor ? "own" : "other"
}

/** The newest `limit` messages of a chat, newest first. */
function recentMessages(chatId: string, limit: number) {
  return db
    .select()
    .from(message)
    .where(eq(message.chatId, chatId))
    .orderBy(desc(message.createdAt))
    .limit(limit)
}

/** Rows that belong to a message, grouped by its id. */
function byMessage<Row extends { messageId: string }>(rows: Row[]) {
  const groups = new Map<string, Row[]>()
  for (const row of rows) groups.set(row.messageId, [...(groups.get(row.messageId) ?? []), row])
  return groups
}

/** The visitor's chats, most recently used first. */
export function listSessions(visitor: string): Promise<Session[]> {
  return db
    .select({ id: chat.id, title: chat.title })
    .from(chat)
    .where(eq(chat.visitorId, visitor))
    .orderBy(desc(chat.updatedAt))
    .limit(50)
}

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
  const filesOf = byMessage(files)
  const turns = messages.map((row): Turn => {
    const own = filesOf.get(row.id) ?? []
    return {
      id: row.id,
      from: row.role,
      content: row.content,
      ...(row.reasoning && { reasoning: row.reasoning }),
      ...(own.length > 0 && {
        files: own.map((file) => ({
          id: file.id,
          name: file.name,
          ...(isPreviewableImage(file.type) && { src: chatPaths.file(chatId, file.id) }),
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

const TITLE_CHARS = 60

/** Save a user turn: the chat row on first use, the message, and each file in R2. */
export async function saveUserTurn(
  chatId: string,
  visitor: string,
  content: string,
  files: File[]
) {
  const firstLine = content.split("\n")[0]?.trim() || files[0]?.name || "Untitled chat"
  const title =
    firstLine.length > TITLE_CHARS ? `${firstLine.slice(0, TITLE_CHARS - 1)}…` : firstLine
  await db.insert(chat).values({ id: chatId, visitorId: visitor, title }).onConflictDoNothing()
  await db
    .update(chat)
    .set({ updatedAt: new Date() })
    .where(and(eq(chat.id, chatId), eq(chat.visitorId, visitor)))
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
  const [lastUser] = await db
    .select({ createdAt: message.createdAt })
    .from(message)
    .where(and(eq(message.chatId, chatId), eq(message.role, "user")))
    .orderBy(desc(message.createdAt))
    .limit(1)
  if (!lastUser) return false
  await db
    .delete(message)
    .where(and(eq(message.chatId, chatId), gt(message.createdAt, lastUser.createdAt)))
  return true
}

async function promptFor(chatId: string) {
  const [recent, files] = await Promise.all([
    recentMessages(chatId, HISTORY_TURNS),
    db
      .select({ messageId: attachment.messageId, name: attachment.name, text: attachment.text })
      .from(attachment)
      .where(eq(attachment.chatId, chatId)),
  ])
  const filesOf = byMessage(files)
  const turns = recent.reverse().map((row) => {
    const attached = (filesOf.get(row.id) ?? []).map((file) =>
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
    return aiProblem(request, error)
  }

  const [toBrowser, toSave] = stream.body!.tee()
  waitUntil(saveAnswer(chatId, model, lastId, toSave))
  return new Response(toBrowser, { headers: stream.headers })
}

/** The problem response for a known way `ai.stream()` refuses; anything else rethrows. */
function aiProblem(request: Request, error: unknown): Response {
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

async function saveAnswer(
  chatId: string,
  model: string,
  after: string | undefined,
  body: ReadableStream<Uint8Array>
) {
  let content = ""
  let reasoning = ""
  let finished = false
  for await (const event of readAiStream(body)) {
    if (event.type === "delta") content += event.text
    else if (event.type === "reasoning") reasoning += event.text
    else if (event.type === "done") finished = true
    else return // limit or error: nothing worth saving
  }
  if (!finished || !content.trim()) return

  // A regenerate or a newer message may have moved the thread on while this one streamed.
  const [latest] = await recentMessages(chatId, 1)
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
