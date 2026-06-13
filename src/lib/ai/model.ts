// AI SDK version notes (ai@6.0.204, @ai-sdk/openai-compatible@2.0.50):
// - streamText step loop: `stopWhen: stepCountIs(n)` (v6)
// - Route Handler response: `result.toUIMessageStreamResponse()` (v6)
// - tool schema key: `inputSchema:` (v6, NOT `parameters`)
// - useChat: `useChat({ api, body })` still works in v6 via @ai-sdk/react
// - message text: `message.parts[]` in v6 (UIMessage)
// - createOpenAICompatible: `{ name, baseURL, apiKey }` from @ai-sdk/openai-compatible

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const BASE_URL = process.env.AI_BASE_URL ?? "https://api.groq.com/openai/v1";
const MODEL = process.env.AI_MODEL ?? "llama-3.3-70b-versatile";

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

export function getModel() {
  const provider = createOpenAICompatible({
    name: "fufi-ai",
    baseURL: BASE_URL,
    apiKey: process.env.AI_API_KEY ?? "",
  });
  return provider(MODEL);
}
