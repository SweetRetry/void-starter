import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

import { chatId } from "@/lib/chat"
import { chatAccess, listSessions, loadChat } from "./chat.server"
import { ensureVisitor } from "./visitor.server"

/** The chat page's data: the thread, and the visitor's sessions for the sidebar. */
export const getChat = createServerFn()
  .validator(chatId)
  .handler(async ({ data }) => {
    const visitor = ensureVisitor()
    // Someone else's chat answers like a missing one, so ids can't be probed.
    if ((await chatAccess(data.chatId, visitor)) === "other") throw notFound()
    const [chat, sessions] = await Promise.all([loadChat(data.chatId), listSessions(visitor)])
    return { ...chat, sessions }
  })
