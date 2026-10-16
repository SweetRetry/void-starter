import { Link, useRouter } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { useState } from "react"
import { toast } from "sonner"

import { createNote } from "@/server/notes.functions"

interface NoteListProps {
  notes: Array<{ id: string; title: string }>
}

export function NoteList({ notes }: NoteListProps) {
  return (
    <nav aria-label="Notes" className="flex flex-col gap-1 px-2">
      <NewNoteButton />
      {notes.map((note) => (
        <Link
          key={note.id}
          to="/notes/$noteId"
          params={{ noteId: note.id }}
          className="flex h-10 items-center truncate rounded-md px-2 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
        >
          <span className="truncate">{note.title}</span>
        </Link>
      ))}
    </nav>
  )
}

export function NewNoteButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function create() {
    setPending(true)
    try {
      const { id } = await createNote({ data: { title: "Untitled", body: "" } })
      await router.invalidate()
      await router.navigate({ to: "/notes/$noteId", params: { noteId: id } })
    } catch {
      toast.error("The note wasn't created. Try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Button variant="secondary" className="mb-2 justify-start" disabled={pending} onClick={create}>
      New note
    </Button>
  )
}
