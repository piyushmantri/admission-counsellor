import type { FastifyInstance } from "fastify";
import { getDb } from "../../util/db.js";

export async function chatsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/chats", async (_req, reply) => {
    const sql = getDb();
    const chats = await sql`
      SELECT
        chat_id,
        COUNT(*)::int AS message_count,
        MAX(created_at) AS last_at,
        LEFT(
          (SELECT content FROM chat_messages m2
           WHERE m2.chat_id = m.chat_id ORDER BY created_at DESC LIMIT 1),
          120
        ) AS last_preview
      FROM chat_messages m
      GROUP BY chat_id
      ORDER BY MAX(created_at) DESC
    `;
    return reply.send({ chats });
  });

  app.get<{ Params: { chatId: string } }>("/chats/:chatId", async (req, reply) => {
    const { chatId } = req.params;
    const sql = getDb();
    const messages = await sql`
      SELECT id, chat_id, role, content, created_at
      FROM chat_messages
      WHERE chat_id = ${chatId}
      ORDER BY created_at ASC
    `;
    return reply.send({ messages });
  });
}
