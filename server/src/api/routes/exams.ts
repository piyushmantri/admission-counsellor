import type { FastifyInstance } from "fastify";
import { getDb } from "../../util/db.js";
import {
  createAttempt,
  deleteAttempt,
  listAttempts,
  type NewAttempt,
} from "../../../../src/db/repos/examAttempts.js";
import { ensureStudent } from "../../../../src/db/repos/students.js";
import type { ExamName } from "../../../../src/types.js";

const VALID_EXAMS: ReadonlySet<ExamName> = new Set([
  "JEE_MAIN",
  "JEE_ADVANCED",
  "MHT_CET",
  "BITSAT",
  "VITEEE",
  "KCET",
  "AP_EAMCET",
  "WBJEE",
  "NEET",
]);

export async function examsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { chatId: string } }>(
    "/chats/:chatId/exams",
    async (req, reply) => {
      const { chatId } = req.params;
      const sql = getDb();
      const attempts = await listAttempts(sql, chatId);
      return reply.send({ attempts });
    }
  );

  app.post<{ Params: { chatId: string }; Body: Record<string, unknown> }>(
    "/chats/:chatId/exams",
    async (req, reply) => {
      const { chatId } = req.params;
      const body = req.body ?? {};
      const examName = body.exam_name as ExamName | undefined;
      if (!examName || !VALID_EXAMS.has(examName)) {
        return reply.code(400).send({ error: "exam_name must be one of the supported exam codes" });
      }
      const year = Number(body.year);
      if (!Number.isFinite(year)) {
        return reply.code(400).send({ error: "year is required" });
      }
      const marks = body.marks == null ? null : Number(body.marks);
      const rank = body.rank == null ? null : Number(body.rank);
      const percentile = body.percentile == null ? null : Number(body.percentile);
      if (marks == null && rank == null && percentile == null) {
        return reply.code(400).send({
          error: "at least one of marks, rank, or percentile must be provided",
        });
      }
      const dto: NewAttempt = {
        exam_name: examName,
        year,
        marks,
        rank,
        percentile,
        category: (body.category as NewAttempt["category"]) ?? "GEN",
      };
      const sql = getDb();
      await ensureStudent(sql, chatId);
      try {
        const row = await createAttempt(sql, chatId, dto);
        return reply.code(201).send(row);
      } catch (err) {
        const pgErr = err as { code?: string; message?: string };
        if (pgErr.code === "23505") {
          return reply.code(409).send({ error: pgErr.message ?? "conflict" });
        }
        throw err;
      }
    }
  );

  app.delete<{ Params: { chatId: string; id: string } }>(
    "/chats/:chatId/exams/:id",
    async (req, reply) => {
      const { chatId, id } = req.params;
      const sql = getDb();
      await deleteAttempt(sql, chatId, id);
      return reply.send({ ok: true });
    }
  );
}
