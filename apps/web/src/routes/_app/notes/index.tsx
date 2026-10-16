import { createFileRoute, getRouteApi } from "@tanstack/react-router"

import { NewNoteButton, NoteList } from "@/components/note-list"

const app = getRouteApi("/_app")

export const Route = createFileRoute("/_app/notes/")({
  head: () => ({ meta: [{ title: "Your notes · Void Starter" }] }),
  component: NotesHome,
})

function NotesHome() {
  const notes = app.useLoaderData()

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-4xl font-semibold">Your notes</h1>
      {/* Phones get the list here; wider screens already show it in the sidebar. */}
      <div className="mt-8 text-sm md:hidden">
        <NoteList notes={notes} />
      </div>
      <div className="mt-8 hidden md:block">
        {notes.length === 0 ? (
          <div className="flex flex-col items-start gap-4">
            <p className="text-sm text-muted-foreground">
              Notes you write live in D1. Attach a file to keep it in R2, and summarize with AI
              Gateway.
            </p>
            <NewNoteButton />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pick a note from the sidebar, or start a new one.
          </p>
        )}
      </div>
    </main>
  )
}
