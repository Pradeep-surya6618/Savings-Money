import { listConversations } from "@/services/assistant";
import { isAiConfigured } from "@/lib/ai/model";
import { AssistantView } from "@/components/assistant/assistant-view";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const conversations = await listConversations();
  return <AssistantView conversations={conversations} configured={isAiConfigured()} />;
}
