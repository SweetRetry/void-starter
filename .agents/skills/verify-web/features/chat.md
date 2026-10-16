# Answers and sessions

## Sub-features

Streaming answers and reasoning, stopping, regenerating, reloading saved turns, session switching and visitor ownership.

## How to get to it (user POV)

Open Playground or New chat. Type a turn and use Send message or Enter. Previous Chats appear in the sidebar, or under Chats on narrow screens.

## Driving it with a browser

Use a dedicated connected development checkout following `docs/deployment.md`. Run `pnpm dev` there and record its URL and PID. This journey calls Workers AI and persists local D1 data. The automated smoke's temporary instance forces local bindings and cannot prove it.

1. Fill the composer with a unique marker and a short question. Click `button[aria-label="Send message"]`. Capture the user turn and in-progress Thinking or Stop state.
2. Wait for a nonempty answer and `button[aria-label="Copy answer"]`. An error toast is a failure, even if the user turn remains visible.
3. Reload the same `/c/<uuid>`. Verify the exact submitted turn and completed answer remain. This proves persistence through the public page loader.
4. Open New chat and select the prior Chat from the visible Chats navigation. Verify the same turns return.
5. For retry changes, click `button[aria-label="Regenerate"]`. Verify a completed replacement answer and reload to check persistence.
6. For stop changes, send a long-output request and click `button[aria-label="Stop"]` while streaming. Verify the composer is usable again and record what survives reload.
7. For visitor ownership changes, open that URL in a separately isolated browser context. Verify the original turns and session list are inaccessible. Another tab in the same profile is the same Visitor.

## Gotchas

A connected Cloudflare account, an existing AI Gateway and model access are required. Missing setup, quota exhaustion or unavailable models block this journey and must be reported. Reasoning is model-dependent. Record the selected model when checking it. Treat failures without automatic resubmission to avoid duplicate paid requests. Preserve screenshots and logs before stopping the owned server. Local test records can remain in the dedicated checkout; deleting data requires separate authorization.
