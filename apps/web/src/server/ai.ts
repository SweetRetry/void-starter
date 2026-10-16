/**
 * AI configuration in one place. Workers AI calls name the AI Gateway explicitly, so every
 * request shows up in the gateway's logs, analytics and cache. `ai.gateway` in void.config.ts
 * covers only provider-native calls (`ai.provider().fetch()`).
 */
export const AI_GATEWAY_ID = "void-starter"

export const SUMMARY_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"

export function summaryMessages(title: string, body: string) {
  return [
    {
      role: "system" as const,
      content:
        "Summarize the user's note in at most three short sentences. Plain text, no preamble, no lists. Keep the note's language.",
    },
    { role: "user" as const, content: `# ${title}\n\n${body}` },
  ]
}
