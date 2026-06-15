import { streamText, stepCountIs, convertToModelMessages, NoSuchToolError, type UIMessage } from "ai";
import { getSession } from "@/lib/auth/session";
import { getModel, isAiConfigured } from "@/lib/ai/model";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { assistantTools } from "@/lib/ai/tools";
import { actionTools as writeTools } from "@/lib/ai/action-tools";
import { appendTurn } from "@/services/assistant";
import { getAiActionsEnabled } from "@/services/settings";

function textOf(m: UIMessage): string {
  return m.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (!isAiConfigured()) return new Response("AI not configured", { status: 503 });

  const { messages, conversationId } = (await req.json()) as {
    messages: UIMessage[];
    conversationId: string | null;
  };

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userText = lastUser ? textOf(lastUser) : "";
  let convId = conversationId;
  if (userText) convId = await appendTurn(conversationId, "user", userText);

  const actionsEnabled = await getAiActionsEnabled();

  const modelMessages = await convertToModelMessages(messages);
  const result = streamText({
    model: getModel(),
    system: buildSystemPrompt(new Date().toISOString().slice(0, 10), actionsEnabled),
    messages: modelMessages,
    tools: actionsEnabled ? { ...assistantTools, ...writeTools } : assistantTools,
    stopWhen: stepCountIs(8),
    // Groq/Llama sometimes emits `null` / empty args for tool calls; our tools all
    // have optional params, so coerce that to an empty object instead of erroring/looping.
    experimental_repairToolCall: async ({ toolCall, error }) => {
      if (NoSuchToolError.isInstance(error)) return null;
      const input = toolCall.input?.trim();
      if (!input || input === "null") return { ...toolCall, input: "{}" };
      return null;
    },
    onFinish: async ({ text }) => {
      if (text.trim() && convId) await appendTurn(convId, "assistant", text);
    },
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("[assistant] stream error", error);
      return "Something went wrong. Please try again.";
    },
  });
}
