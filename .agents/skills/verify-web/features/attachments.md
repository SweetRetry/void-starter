# Attachments

## Sub-features

Selecting and removing a file, submitting it with a turn, loading its saved attachment and downloading the stored bytes.

## How to get to it (user POV)

Open a new Chat and use Attach files in the composer. An attached chip can be removed before sending. Saved attachments appear beside their user turn.

## Driving it with a browser

Use the connected environment from [Answers and sessions](chat.md). Create a small UTF-8 text fixture with a unique marker in the evidence directory and record its SHA-256.

1. Click `button[aria-label="Attach files"]` and select the fixture through the file chooser. With Playwright, arm `page.waitForEvent("filechooser")` before clicking, then call the chooser's `setFiles()` with the fixture's absolute path. Other browser tools may use their equivalent file-upload control.
2. Verify the filename chip. Remove it through the visible remove control and verify it disappears. Select it again.
3. Type a request to quote the marker and submit. Verify the filename on the saved user turn and a completed answer containing the marker.
4. Reload the Chat and verify the attachment remains. Read the rendered attachment link from a snapshot. Download that URL using the same Visitor session. With Playwright, `page.request.get(url)` shares the context's cookies. Require HTTP 200 and save the response body as bytes. Compare the downloaded bytes and SHA-256 with the fixture.
5. For image preview changes, repeat selection and reload with a small image fixture. Capture the visible preview as well as byte equality.

## Gotchas

The chip alone proves only local selection. Successful download after reload proves D1 metadata and R2 bytes are accessible to the Visitor. The route uses `/api/chats/<chatId>/files/<fileId>`; obtain ids from the actual saved link. Missing AI setup blocks the submit path rather than reducing the check to a chip screenshot. File-size and type validation belong to `apps/web/src/lib/chat.ts`; inspect its current limits before testing rejection boundaries.
