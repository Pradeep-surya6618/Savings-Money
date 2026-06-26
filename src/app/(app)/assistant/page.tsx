import { listConversations } from "@/services/assistant";
import { isAiConfigured } from "@/lib/ai/model";
import { getCurrentUser } from "@/lib/user";
import { AssistantView } from "@/components/assistant/assistant-view";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const [conversations, { user }] = await Promise.all([listConversations(), getCurrentUser()]);
  return (
    <AssistantView
      conversations={conversations}
      configured={isAiConfigured()}
      name={user.name}
      image={user.image}
    />
  );
}
