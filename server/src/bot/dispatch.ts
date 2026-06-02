import { getContext, handleSlashCommand } from "../../../src/hook.js";

const SLASH_RE = /^\/([a-z-]+)(?:\s+([\s\S]*))?$/;

async function sendMessage(token: string, chatId: string, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function handleUpdate(
  update: Record<string, unknown>,
  token: string,
  targetChatId: string | null,
  databaseUrl: string
): Promise<void> {
  const msg = update.message as Record<string, unknown> | undefined;
  if (!msg) return;
  const chat = msg.chat as Record<string, unknown> | undefined;
  const chatId = String(chat?.id ?? "");
  if (!chatId) return;
  const text = ((msg.text as string | undefined) ?? "").trim();
  if (!text) return;

  // Drop messages from non-target chats — the operator scopes the bot to a
  // single chat via /api/config/bot.target_chat_id.
  if (targetChatId && chatId !== targetChatId) {
    console.warn("[counseller bot] dropped message from non-target chat", chatId);
    return;
  }

  const ctx = { databaseUrl };
  const slashMatch = SLASH_RE.exec(text);
  if (slashMatch) {
    const cmd = slashMatch[1] ?? "";
    const args = slashMatch[2] ?? "";
    try {
      const reply = await handleSlashCommand(cmd, args, chatId, ctx);
      await sendMessage(token, chatId, reply);
    } catch (err) {
      console.error("[counseller bot] dispatch slash error:", err);
      await sendMessage(token, chatId, "An error occurred processing your command.");
    }
    return;
  }

  // Free-text turn: build the persona/profile/next-step prompt and ask Gemini.
  try {
    const { generateReply } = await import("./llm.js");
    const systemPrompt = await getContext(chatId, ctx);
    const reply = await generateReply(systemPrompt, text, chatId, ctx);
    await sendMessage(token, chatId, reply);
  } catch (err) {
    console.error("[counseller bot] dispatch llm error:", err);
    await sendMessage(token, chatId, "An error occurred. Please try again.");
  }
}
