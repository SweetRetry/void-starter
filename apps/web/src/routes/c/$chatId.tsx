import { createFileRoute, notFound } from "@tanstack/react-router"

import { ChatApp } from "@/components/chat/chat-app"
import { useChat } from "@/components/chat/use-chat"
import { chatId } from "@/lib/chat"
import { getChat } from "@/server/chat.functions"

export const Route = createFileRoute("/c/$chatId")({
  loader: ({ params }) => {
    if (!chatId.safeParse(params).success) throw notFound()
    return getChat({ data: params })
  },
  component: ChatPage,
})

function ChatPage() {
  const { chatId } = Route.useParams()
  // A new key per chat, so "New chat" starts from a clean transport.
  return <Chat key={chatId} chatId={chatId} />
}

function Chat({ chatId }: { chatId: string }) {
  const saved = Route.useLoaderData()
  const chat = useChat(chatId, saved.turns, saved.model)

  return (
    <div className="h-dvh">
      <ChatApp {...chat} title="Void Starter" empty={<Welcome />} />
    </div>
  )
}

function Welcome() {
  return (
    <div>
      <h2 className="text-3xl font-semibold text-balance">Ask anything, or drop in a file.</h2>
      <p className="mt-4 text-sm text-muted-foreground">
        Messages are saved in D1 and files in R2. Answers stream from Workers AI through AI Gateway.
        There are no accounts, so anyone with this link can read this chat.
      </p>
    </div>
  )
}
