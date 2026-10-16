import { useRouter } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { problemDetail } from "@/lib/api-problem"
import { formatBytes } from "@/lib/format"
import { ATTACHMENT_TYPES } from "@/lib/note-input"

interface NoteAttachmentProps {
  noteId: string
  attachment: { name: string; size: number } | null
}

/** One R2 file per note. Upload, download and remove go through /api/notes/$noteId/attachment. */
export function NoteAttachment({ noteId, attachment }: NoteAttachmentProps) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const url = `/api/notes/${noteId}/attachment`

  async function send(init: RequestInit, failure: string) {
    setPending(true)
    try {
      const response = await fetch(url, init)
      if (!response.ok) {
        toast.error(await problemDetail(response, failure))
        return
      }
      await router.invalidate()
    } finally {
      setPending(false)
    }
  }

  function upload(file: File | undefined) {
    if (!file) return
    void send(
      {
        method: "PUT",
        body: file,
        headers: { "content-type": file.type, "x-file-name": file.name },
      },
      "The file wasn't uploaded. Try again."
    )
  }

  return (
    <section aria-labelledby="attachment-heading">
      <h2 id="attachment-heading" className="text-sm font-medium">
        Attachment
      </h2>
      {attachment ? (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <a href={url} className="link min-w-0 truncate text-primary">
            {attachment.name}
          </a>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {formatBytes(attachment.size)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            disabled={pending}
            onClick={() => send({ method: "DELETE" }, "The file wasn't removed. Try again.")}
          >
            Remove file
          </Button>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => input.current?.click()}
          >
            {pending ? "Uploading…" : "Attach a file"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Images, PDF, text or Markdown, up to 10 MB.
          </span>
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept={ATTACHMENT_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          upload(event.target.files?.[0])
          event.target.value = ""
        }}
      />
    </section>
  )
}
