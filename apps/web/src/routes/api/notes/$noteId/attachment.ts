import { createFileRoute } from "@tanstack/react-router"
import { db, eq } from "void/db"
import { storage } from "void/storage"

import { note } from "../../../../../db/schema"
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES } from "@/lib/note-input"
import { ownNoteOrProblem, withProblems } from "@/server/api.server"
import { problemResponse } from "@/server/problem"

/**
 * One R2 attachment per note.
 * PUT: raw file body, `content-type` and `x-file-name` headers. GET: download. DELETE: remove.
 */
export const Route = createFileRoute("/api/notes/$noteId/attachment")({
  server: {
    handlers: {
      GET: withProblems(async ({ request, params }) => {
        const row = await ownNoteOrProblem(request, params.noteId)
        if (row instanceof Response) return row
        const object = row.attachmentKey ? await storage.get(row.attachmentKey) : null
        if (!object) return problemResponse(request, "NOT_FOUND", "This note has no attachment.")

        const headers = new Headers()
        object.writeHttpMetadata(headers)
        headers.set("etag", object.httpEtag)
        // Never let an uploaded HTML or SVG run as a page on this origin.
        headers.set("x-content-type-options", "nosniff")
        headers.set(
          "content-disposition",
          `attachment; filename*=UTF-8''${encodeURIComponent(row.attachmentName ?? "attachment")}`
        )
        headers.set("cache-control", "private, no-store")
        return new Response(object.body, { headers })
      }),

      PUT: withProblems(async ({ request, params }) => {
        const row = await ownNoteOrProblem(request, params.noteId)
        if (row instanceof Response) return row

        const type = request.headers.get("content-type")?.split(";")[0]?.trim() ?? ""
        if (!(ATTACHMENT_TYPES as readonly string[]).includes(type)) {
          return problemResponse(
            request,
            "UNSUPPORTED_MEDIA_TYPE",
            "Attach an image, a PDF, or a text or Markdown file."
          )
        }
        const declared = Number(request.headers.get("content-length") ?? Number.NaN)
        if (declared > ATTACHMENT_MAX_BYTES) {
          return problemResponse(request, "PAYLOAD_TOO_LARGE", "Attachments can be up to 10 MB.")
        }
        // content-length can be absent or wrong, so the size that counts is what arrives.
        const file = await request.arrayBuffer()
        if (file.byteLength === 0 || file.byteLength > ATTACHMENT_MAX_BYTES) {
          return problemResponse(
            request,
            file.byteLength === 0 ? "VALIDATION_ERROR" : "PAYLOAD_TOO_LARGE",
            file.byteLength === 0 ? "The file is empty." : "Attachments can be up to 10 MB."
          )
        }

        const name = (request.headers.get("x-file-name") ?? "attachment").slice(0, 200)
        const key = `users/${row.userId}/${row.id}/${crypto.randomUUID()}`
        await storage.put(key, file, { httpMetadata: { contentType: type } })
        await db
          .update(note)
          .set({
            attachmentKey: key,
            attachmentName: name,
            attachmentType: type,
            attachmentSize: file.byteLength,
          })
          .where(eq(note.id, row.id))
        if (row.attachmentKey) await storage.delete(row.attachmentKey)

        return Response.json({ name, type, size: file.byteLength })
      }),

      DELETE: withProblems(async ({ request, params }) => {
        const row = await ownNoteOrProblem(request, params.noteId)
        if (row instanceof Response) return row
        if (row.attachmentKey) {
          await db
            .update(note)
            .set({
              attachmentKey: null,
              attachmentName: null,
              attachmentType: null,
              attachmentSize: null,
            })
            .where(eq(note.id, row.id))
          await storage.delete(row.attachmentKey)
        }
        return new Response(null, { status: 204 })
      }),
    },
  },
})
