import type { FastifyInstance } from "fastify";
import { getDb } from "../../util/db.js";
import { getStudentBundle } from "../../../../src/db/repos/students.js";
import { loadCutoffsForExams } from "../../../../src/db/repos/colleges.js";
import { recommend } from "../../../../src/engine/recommender.js";
import type { ExamName, Category } from "../../../../src/types.js";

export async function recommendationsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { chatId: string } }>(
    "/chats/:chatId/recommendations",
    async (req, reply) => {
      const { chatId } = req.params;
      const sql = getDb();
      const bundle = await getStudentBundle(sql, chatId);
      if (!bundle.student || bundle.attempts.length === 0) {
        return reply.send({ recommendations: [] });
      }
      const examNames = Array.from(
        new Set(bundle.attempts.map((a) => a.exam_name as ExamName))
      );
      const categories = Array.from(
        new Set(bundle.attempts.map((a) => a.category as Category))
      );
      const years = Array.from(new Set(bundle.attempts.map((a) => a.year)));
      const cutoffs = await loadCutoffsForExams(sql, examNames, categories, years);
      const recs = recommend(bundle.attempts, bundle.prefs, cutoffs);
      // Trim to projection per lesson 2026-04-30 (list/get split).
      const trimmed = recs.map((r) => ({
        college_id: r.college_id,
        college_name: r.college_name,
        branch_name: r.branch_name,
        exam_used: r.exam_used,
        student_value: r.student_value,
        cutoff_value: r.cutoff_value,
        margin: r.margin,
        fit_reasons: r.fit_reasons,
      }));
      return reply.send({ recommendations: trimmed });
    }
  );
}
