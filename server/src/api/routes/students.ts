import type { FastifyInstance } from "fastify";
import { getDb } from "../../util/db.js";
import { getStudentBundle } from "../../../../src/db/repos/students.js";

export async function studentsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/students", async (_req, reply) => {
    const sql = getDb();
    const rows = await sql`
      SELECT chat_id, name, category, created_at
      FROM students ORDER BY created_at DESC
    `;
    return reply.send({ students: rows });
  });

  app.get<{ Params: { chatId: string } }>("/students/:chatId", async (req, reply) => {
    const { chatId } = req.params;
    const sql = getDb();
    const bundle = await getStudentBundle(sql, chatId);
    if (!bundle.student) return reply.code(404).send({ error: "Student not found" });
    return reply.send(bundle);
  });

  app.delete<{ Params: { chatId: string } }>("/students/:chatId", async (req, reply) => {
    const { chatId } = req.params;
    const sql = getDb();
    // CASCADE on FKs handles exam_attempts + preferences.
    await sql`DELETE FROM students WHERE chat_id = ${chatId}`;
    return reply.send({ ok: true });
  });
}
