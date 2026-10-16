import type { PromptModel } from "@/components/agents/prompt-input"

/**
 * Workers AI models the composer offers. They run on Cloudflare's free daily allowance, so the
 * app needs no provider key. Qwen3 and gpt-oss stream their reasoning before the answer.
 */
export const MODELS = [
  { id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", name: "Llama 3.3 70B", provider: "meta" },
  { id: "@cf/qwen/qwen3-30b-a3b-fp8", name: "Qwen3 30B", provider: "qwen" },
  { id: "@cf/openai/gpt-oss-20b", name: "gpt-oss 20B", provider: "openai" },
  {
    id: "@cf/mistralai/mistral-small-3.1-24b-instruct",
    name: "Mistral Small 3.1",
    provider: "mistral",
  },
] as const satisfies readonly PromptModel[]

export type ModelId = (typeof MODELS)[number]["id"]

export const DEFAULT_MODEL: ModelId = MODELS[0].id
