import { GoogleGenerativeAI } from "@google/generative-ai";
import { handleSlashCommand } from "../../../src/hook.js";

// Matches `CALL: /command {json-args}` lines emitted by the model. The model
// is instructed (in the system prompt) to use these to persist data; the
// dispatcher executes them and strips them from the user-visible reply.
// V1 deliberately avoids Gemini function-calling; this string-grammar is
// fragile but keeps the standalone bot self-contained.
const CALL_RE = /CALL:\s*(\/[a-z-]+)\s*(\{[^}]*\})/g;

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!genAI) genAI = new GoogleGenerativeAI(key);
  return genAI;
}

export async function generateReply(
  systemPrompt: string,
  userText: string,
  chatId: string,
  ctx: { databaseUrl?: string | null }
): Promise<string> {
  const ai = getGenAI();
  if (!ai) {
    return [
      "Counseller standalone bot LLM is not configured (GEMINI_API_KEY missing).",
      "Use slash commands directly:",
      "  /add-exam {\"exam_name\":\"JEE_MAIN\",\"year\":2024,\"percentile\":95,\"category\":\"GEN\"}",
      "  /set-preferences {\"preferred_branches\":[\"CSE\"],\"preferred_locations\":[\"Maharashtra\"]}",
      "  /recommend",
      "  /list-exams",
      "  /clear",
    ].join("\n");
  }

  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
  const fullSystem =
    systemPrompt +
    "\n\nWhen you need to persist data, emit a line starting with 'CALL: /command {json}' before your user-facing reply. These CALL lines will be executed and stripped before the reply is sent. Example: CALL: /add-exam {\"exam_name\":\"JEE_MAIN\",\"year\":2024,\"percentile\":94.7,\"category\":\"GEN\"}";

  const result = await model.generateContent({
    systemInstruction: fullSystem,
    contents: [{ role: "user", parts: [{ text: userText }] }],
  });

  let text = result.response.text();

  // Execute CALL markers, then strip them from the output.
  const matches = [...text.matchAll(CALL_RE)];
  for (const match of matches) {
    const cmd = (match[1] ?? "").replace(/^\//, "");
    const args = match[2] ?? "";
    try {
      await handleSlashCommand(cmd, args, chatId, ctx);
    } catch (err) {
      console.error("[counseller llm] CALL execution error:", cmd, err);
    }
  }
  text = text.replace(CALL_RE, "").replace(/\n{3,}/g, "\n\n").trim();

  return text || "I couldn't generate a response. Please try again.";
}
