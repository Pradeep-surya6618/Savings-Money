import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import { getSession } from "@/lib/auth/session";
import { getModel, isAiConfigured } from "@/lib/ai/model";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { assistantTools } from "@/lib/ai/tools";
import { appendTurn } from "@/services/assistant";

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

  const modelMessages = await convertToModelMessages(messages);
  const result = streamText({
    model: getModel(),
    system: buildSystemPrompt(new Date().toISOString().slice(0, 10)),
    messages: modelMessages,
    tools: assistantTools,
    stopWhen: stepCountIs(6),
    onFinish: async ({ text }) => {
      if (text.trim() && convId) await appendTurn(convId, "assistant", text);
    },
  });

  return result.toUIMessageStreamResponse();
}
