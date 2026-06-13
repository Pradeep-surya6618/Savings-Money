/** Derive a conversation title from its first message. Pure helper (no server
 *  directive) so it can be imported by the "use server" service module and tested
 *  directly. */
export function deriveTitle(firstMessage: string): string {
  const t = firstMessage.trim();
  if (!t) return "New chat";
  return t.length > 48 ? `${t.slice(0, 47)}…` : t;
}
