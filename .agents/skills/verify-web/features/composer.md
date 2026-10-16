# Composer

## Sub-features

Starting a fresh Chat, editing a draft, enabling Send and choosing a model.

## How to get to it (user POV)

Use Playground in the site header, New chat in the Chat sidebar, or navigate to `/chat`. Each entry creates a new `/c/<uuid>` URL. A Chat is persisted only on its first submitted turn.

## Driving it with a browser

Smoke clicks `header a[href="/chat"]` and waits for `textarea[placeholder="Ask anything, or drop in a file."]`. It verifies the UUID URL and disabled `button[aria-label="Send message"]`, types `Verification draft`, checks Send becomes enabled, then clears the textarea and checks Send becomes disabled.

For launch changes, repeat through New chat and direct `/chat`, verifying different UUIDs and empty threads. For model picker changes, click `button[aria-label^="Model: "]`, choose a visible `menuitemradio` from the snapshot and verify the trigger displays that model. Submitting with that model belongs to the connected Chat journey.

## Gotchas

The composer becoming usable proves the Chat loader can read migrated D1. It does not prove a saved Chat or an AI answer. Desktop and mobile New chat links coexist. Choose the visible entry.
