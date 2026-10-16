import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { NoteAttachment } from "@/components/note-attachment"
import { NoteSummary } from "@/components/note-summary"
import { TextField } from "@/components/text-field"
import { noteInput } from "@/lib/note-input"
import { deleteNote, getNote, updateNote } from "@/server/notes.functions"

export const Route = createFileRoute("/_app/notes/$noteId")({
  loader: ({ params }) => getNote({ data: { id: params.noteId } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.title ?? "Note"} · Void Starter` }],
  }),
  pendingComponent: NoteSkeleton,
  notFoundComponent: NoteNotFound,
  component: NotePage,
})

function NotePage() {
  const note = Route.useLoaderData()
  const router = useRouter()
  const form = useForm({
    resolver: zodResolver(noteInput),
    values: { title: note.title, body: note.body },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateNote({ data: { id: note.id, ...values } })
      await router.invalidate()
      toast.success("Note saved.")
    } catch {
      toast.error("The note wasn't saved. Your changes are still here; try again.")
    }
  })

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12">
      <h1 className="sr-only">{note.title}</h1>
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <TextField control={form.control} name="title" label="Title" autoComplete="off" />
          <Controller
            control={form.control}
            name="body"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="body">Note</FieldLabel>
                <Textarea id="body" rows={12} aria-invalid={fieldState.invalid} {...field} />
                <div className="min-h-5">
                  <FieldError errors={[fieldState.error]} />
                </div>
              </Field>
            )}
          />
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
              {form.formState.isSubmitting ? "Saving…" : "Save note"}
            </Button>
            <DeleteNoteButton id={note.id} title={note.title} />
          </div>
        </FieldGroup>
      </form>
      <NoteAttachment
        noteId={note.id}
        attachment={
          note.attachmentName && note.attachmentSize !== null
            ? { name: note.attachmentName, size: note.attachmentSize }
            : null
        }
      />
      <NoteSummary
        key={note.id}
        noteId={note.id}
        saved={note.summary}
        canSummarize={note.body.trim() !== ""}
      />
    </main>
  )
}

/** Irreversible: confirm first, spinner text in the button, no optimistic update. */
function DeleteNoteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function remove() {
    setPending(true)
    try {
      await deleteNote({ data: { id } })
      await router.invalidate()
      await router.navigate({ to: "/notes" })
      toast.success("Note deleted.")
    } catch {
      setPending(false)
      toast.error("The note wasn't deleted. Try again.")
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" className="ml-auto" />}>
        Delete note
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            The note and its attachment are removed for good.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep note</AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={remove}>
            {pending ? "Deleting…" : "Delete note"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Retry › First loads: a skeleton in the shape of the content. */
function NoteSkeleton() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-64 w-full" />
      </div>
    </main>
  )
}

function NoteNotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-4xl font-semibold">This note isn't here</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        It may have been deleted, or it belongs to someone else.
      </p>
      <Link to="/notes" className="link mt-4 inline-block text-sm text-primary">
        Back to your notes
      </Link>
    </main>
  )
}
