import { createFileRoute, redirect } from "@tanstack/react-router"

/** Every visit to `/chat` starts a new chat. The chat row is written with its first message. */
export const Route = createFileRoute("/chat")({
  beforeLoad: () => {
    throw redirect({ to: "/c/$chatId", params: { chatId: crypto.randomUUID() } })
  },
})
