import type { FastifyInstance } from "fastify";
import { getDb } from "../../util/db.js";
import { restartBot } from "../../bot/poller.js";

export async function botConfigRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/config/bot — never returns the full token (masked to last 4 chars).
  app.get("/config/bot", async (_req, reply) => {
    const sql = getDb();
    const rows = await sql`
      SELECT id, bot_token, target_chat_id, webhook_secret, last_processed_update_id,
             last_error, last_connected_at, updated_at
      FROM bot_config WHERE id = 'default'
    `;
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return reply.send({
        configured: false,
        bot_token_masked: null,
        target_chat_id: null,
        webhook_secret: null,
        last_error: null,
        last_connected_at: null,
        updated_at: null,
      });
    }
    const token = (row.bot_token as string | null) ?? null;
    return reply.send({
      configured: Boolean(token),
      bot_token_masked: token ? "•••" + token.slice(-4) : null,
      target_chat_id: (row.target_chat_id as string | null) ?? null,
      webhook_secret: (row.webhook_secret as string | null) ?? null,
      last_error: (row.last_error as string | null) ?? null,
      last_connected_at: row.last_connected_at ? String(row.last_connected_at) : null,
      updated_at: row.updated_at ? String(row.updated_at) : null,
    });
  });

  // PUT /api/config/bot — UPSERT with hasOwnProperty semantics; absent key
  // keeps existing value, explicit null clears.
  app.put<{ Body: Record<string, unknown> }>("/config/bot", async (req, reply) => {
    const body = req.body ?? {};
    const sql = getDb();
    const existingRows = await sql`
      SELECT bot_token, target_chat_id, webhook_secret FROM bot_config WHERE id = 'default'
    `;
    const current = (existingRows[0] as Record<string, unknown> | undefined) ?? {};
    const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
    const newToken = has("bot_token")
      ? ((body.bot_token as string | null) ?? null)
      : ((current.bot_token as string | null) ?? null);
    const newChatId = has("target_chat_id")
      ? ((body.target_chat_id as string | null) ?? null)
      : ((current.target_chat_id as string | null) ?? null);
    const newSecret = has("webhook_secret")
      ? ((body.webhook_secret as string | null) ?? null)
      : ((current.webhook_secret as string | null) ?? null);
    await sql`
      INSERT INTO bot_config (id, bot_token, target_chat_id, webhook_secret, updated_at)
      VALUES ('default', ${newToken}, ${newChatId}, ${newSecret}, now())
      ON CONFLICT (id) DO UPDATE SET
        bot_token = EXCLUDED.bot_token,
        target_chat_id = EXCLUDED.target_chat_id,
        webhook_secret = EXCLUDED.webhook_secret,
        updated_at = now()
    `;
    await restartBot();
    return reply.send({ ok: true });
  });

  // POST /api/config/bot/test — calls Telegram getMe with the stored token.
  app.post("/config/bot/test", async (_req, reply) => {
    const sql = getDb();
    const rows = await sql`SELECT bot_token FROM bot_config WHERE id = 'default'`;
    const token = (rows[0] as Record<string, unknown> | undefined)?.bot_token as string | null | undefined;
    if (!token) {
      return reply
        .code(400)
        .send({ ok: false, error: "No bot token configured. Save a token first." });
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = (await res.json()) as {
        ok: boolean;
        result?: { username?: string };
        description?: string;
      };
      if (data.ok) {
        await sql`UPDATE bot_config SET last_connected_at = now(), last_error = NULL WHERE id = 'default'`;
        return reply.send({ ok: true, bot_username: data.result?.username });
      } else {
        const errMsg = data.description ?? "Unknown error";
        await sql`UPDATE bot_config SET last_error = ${errMsg} WHERE id = 'default'`;
        return reply.send({ ok: false, error: errMsg });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await sql`UPDATE bot_config SET last_error = ${errMsg} WHERE id = 'default'`;
      return reply.send({ ok: false, error: errMsg });
    }
  });
}
