import type { FastifyInstance } from "fastify";
import { getDb } from "../../util/db.js";
import {
  getCollege,
  listColleges,
  listBranchesForCollege,
  listCutoffsForCollege,
} from "../../../../src/db/repos/colleges.js";

export async function collegesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/colleges", async (_req, reply) => {
    const sql = getDb();
    const colleges = await listColleges(sql, true);
    return reply.send({ colleges });
  });

  app.get<{ Params: { id: string } }>("/colleges/:id", async (req, reply) => {
    const { id } = req.params;
    const sql = getDb();
    const college = await getCollege(sql, id);
    if (!college) return reply.code(404).send({ error: "College not found" });
    const [branches, cutoffs] = await Promise.all([
      listBranchesForCollege(sql, id),
      listCutoffsForCollege(sql, id),
    ]);
    return reply.send({ ...college, branches, cutoffs });
  });
}
