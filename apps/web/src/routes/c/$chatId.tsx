import { createFileRoute, Link, notFound } from "@tanstack/react-router"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { ChatApp } from "@/components/chat/chat-app"
import { useChat } from "@/components/chat/use-chat"
import { SiteHeader } from "@/components/site-header"
import { chatId, type Session } from "@/lib/chat"
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
  const { sessions } = Route.useLoaderData()

  return (
    <div className="flex h-dvh flex-col">
      <SiteHeader />
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 gap-6 px-4">
        <aside className="hidden w-54 shrink-0 flex-col gap-4 py-4 md:flex">
          <Sessions current={chatId} sessions={sessions} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Below md the sidebar is gone, so the sessions fold above the thread. */}
          <details className="mt-4 rounded-xl bg-card p-4 md:hidden">
            <summary className="cursor-pointer text-sm font-medium">Chats</summary>
            <div className="mt-3 flex flex-col gap-4">
              <Sessions current={chatId} sessions={sessions} />
            </div>
          </details>
          {/* A new key per chat, so switching chats starts from a clean transport. */}
          <Chat key={chatId} chatId={chatId} />
        </div>
      </div>
    </div>
  )
}

function Sessions({ current, sessions }: { current: string; sessions: Session[] }) {
  return (
    <>
      <Link to="/chat" className={buttonVariants({ size: "sm", variant: "secondary" })}>
        New chat
      </Link>
      <nav aria-label="Chats" className="-mx-2 flex min-h-0 flex-col gap-0.5 overflow-y-auto">
        {sessions.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">Your chats show up here.</p>
        ) : (
          sessions.map((session) => (
            <Link
              key={session.id}
              to="/c/$chatId"
              params={{ chatId: session.id }}
              aria-current={session.id === current ? "page" : undefined}
              className={cn(
                "truncate rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                session.id === current && "bg-accent text-foreground"
              )}
            >
              {session.title}
            </Link>
          ))
        )}
      </nav>
    </>
  )
}

function Chat({ chatId }: { chatId: string }) {
  const saved = Route.useLoaderData()
  const chat = useChat(chatId, saved.turns, saved.model)

  return (
    <div className="min-h-0 flex-1">
      <ChatApp {...chat} empty={<Welcome />} />
    </div>
  )
}

function Welcome() {
  return (
    <div>
      <h2 className="text-3xl font-semibold text-balance">Ask anything, or drop in a file.</h2>
      <p className="mt-4 text-sm text-muted-foreground">
        Messages are saved in D1 and files in R2. Answers stream from Workers AI through AI Gateway.
        There are no accounts: a cookie keeps your chats private to this browser.
      </p>
    </div>
  )
}
