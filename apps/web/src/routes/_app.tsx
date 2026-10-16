import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"

import { NoteList } from "@/components/note-list"
import { authClient } from "@/lib/auth-client"
import { listNotes } from "@/server/notes.functions"

/** Signed-in area. Retry › Tools: a sidebar beside the page, text-sm, h-10 rows. */
export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context }) => {
    if (!context.viewer) throw redirect({ to: "/sign-in" })
    return { viewer: context.viewer }
  },
  loader: () => listNotes(),
  component: AppLayout,
})

function AppLayout() {
  const notes = Route.useLoaderData()
  const { viewer } = Route.useRouteContext()
  const router = useRouter()

  async function signOut() {
    await authClient.signOut()
    await router.invalidate()
    await router.navigate({ to: "/" })
  }

  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-54 shrink-0 flex-col bg-sidebar text-sm text-sidebar-foreground md:flex">
        <Link to="/" className="px-4 py-4 font-medium text-foreground">
          Void Starter
        </Link>
        <NoteList notes={notes} />
        <div className="mt-auto flex items-center justify-between gap-2 px-4 py-4">
          <span className="min-w-0 truncate text-xs">{viewer.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
