import { createServerFn } from "@tanstack/react-start"

import { chatId } from "@/lib/chat"
import { loadChat } from "./chat.server"

export const getChat = createServerFn()
  .validator(chatId)
  .handler(({ data }) => loadChat(data.chatId))
