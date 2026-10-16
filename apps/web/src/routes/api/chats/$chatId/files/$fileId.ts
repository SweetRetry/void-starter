import { createFileRoute } from "@tanstack/react-router"
import { and, db, eq } from "void/db"
import { storage } from "void/storage"
import { z } from "zod"

import { attachment } from "../../../../../../db/schema"
import { chatId, isPreviewableImage } from "@/lib/chat"
import { chatRoute } from "@/server/api.server"
import { problemResponse } from "@/server/problem"

const fileParams = chatId.extend({ fileId: z.uuid() })

/** GET a file from R2. Images show inline; everything else downloads. */
export const Route = createFileRoute("/api/chats/$chatId/files/$fileId")({
  server: {
    handlers: {
      GET: chatRoute(fileParams, async ({ request, params }) => {
        const { fileId } = params
        const [row] = await db
          .select()
          .from(attachment)
          .where(and(eq(attachment.id, fileId), eq(attachment.chatId, params.chatId)))
        const object = row ? await storage.get(row.key) : null
        if (!(row && object)) return problemResponse(request, "NOT_FOUND", "File not found.")

        const headers = new Headers()
        object.writeHttpMetadata(headers)
        headers.set("etag", object.httpEtag)
        // An uploaded HTML or SVG file must never run as a page on this origin.
        headers.set("x-content-type-options", "nosniff")
        headers.set("content-security-policy", "sandbox")
        const inline = isPreviewableImage(row.type)
        headers.set(
          "content-disposition",
          `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(row.name)}`
        )
        headers.set("cache-control", "private, max-age=31536000, immutable")
        return new Response(object.body, { headers })
      }),
    },
  },
})
