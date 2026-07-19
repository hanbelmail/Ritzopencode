const STOP_COMMANDS = new Set(["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const START_COMMANDS = new Set(["START", "UNSTOP"]);

export function normalizeSmsPhone(value: string) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw;
}

function consentCommand(content: string) {
  const command = String(content || "").trim().toUpperCase();
  if (STOP_COMMANDS.has(command)) return true;
  if (START_COMMANDS.has(command)) return false;
  return null;
}

export async function getSmsConsent(ctx: any, phoneValue: string) {
  const normalizedPhone = normalizeSmsPhone(phoneValue);
  const row = await ctx.db.query("smsConsents").withIndex("by_phone", (q: any) => q.eq("normalizedPhone", normalizedPhone)).first();
  if (row) return { normalizedPhone, optedOut: row.optedOut, version: row.version, row };

  const contacts = await ctx.db.query("contacts").withIndex("by_phone", (q: any) => q.eq("normalizedPhone", normalizedPhone)).collect();
  if (contacts.some((contact: any) => contact.smsOptOut)) return { normalizedPhone, optedOut: true, version: 0, row: null };

  const conversations = await ctx.db
    .query("conversations")
    .withIndex("by_externalParticipant", (q: any) => q.eq("externalParticipant", normalizedPhone))
    .filter((q: any) => q.eq(q.field("channel"), "sms"))
    .collect();
  let latestCommand: { optedOut: boolean; createdAt: string } | null = null;
  for (const conversation of conversations) {
    if (conversation.smsOptOut) return { normalizedPhone, optedOut: true, version: 0, row: null };
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_createdAt", (q: any) => q.eq("conversationId", conversation._id))
      .order("desc")
      .take(100);
    const message = messages.find((candidate: any) => candidate.direction === "inbound" && consentCommand(candidate.content) !== null);
    if (message && (!latestCommand || message.createdAt > latestCommand.createdAt)) {
      latestCommand = { optedOut: consentCommand(message.content) as boolean, createdAt: message.createdAt };
    }
  }
  return { normalizedPhone, optedOut: latestCommand?.optedOut || false, version: 0, row: null };
}
