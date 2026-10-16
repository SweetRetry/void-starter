import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { and, db, desc, eq } from "void/db"
import { storage } from "void/storage"

import { note } from "../../db/schema"
import { noteId, noteInput } from "../lib/note-input"
import { requireUserId } from "./auth.server"

const ownNote = (id: string, userId: string) => and(eq(note.id, id), eq(note.userId, userId))

export const listNotes = createServerFn().handler(async () => {
  const userId = await requireUserId()
  return db
    .select({
      id: note.id,
      title: note.title,
      updatedAt: note.updatedAt,
      attachmentName: note.attachmentName,
    })
    .from(note)
    .where(eq(note.userId, userId))
    .orderBy(desc(note.updatedAt))
})

export const getNote = createServerFn()
  .validator(noteId)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const [row] = await db.select().from(note).where(ownNote(data.id, userId))
    // Another user's note and a missing note look the same: 404, never 403.
    if (!row) throw notFound()
    return row
  })

export const createNote = createServerFn({ method: "POST" })
  .validator(noteInput)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const [row] = await db
      .insert(note)
      .values({ ...data, userId })
      .returning({ id: note.id })
    return row!
  })

export const updateNote = createServerFn({ method: "POST" })
  .validator(noteInput.extend(noteId.shape))
  .handler(async ({ data: { id, ...values } }) => {
    const userId = await requireUserId()
    const [row] = await db
      .update(note)
      .set(values)
      .where(ownNote(id, userId))
      .returning({ id: note.id })
    if (!row) throw notFound()
    return row
  })

export const deleteNote = createServerFn({ method: "POST" })
  .validator(noteId)
  .handler(async ({ data }) => {
    const userId = await requireUserId()
    const [row] = await db
      .delete(note)
      .where(ownNote(data.id, userId))
      .returning({ attachmentKey: note.attachmentKey })
    if (!row) throw notFound()
    if (row.attachmentKey) await storage.delete(row.attachmentKey)
  })
