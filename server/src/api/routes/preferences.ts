import type { FastifyInstance } from "fastify";
import { getDb } from "../../util/db.js";
import {
  getPrefs,
  upsertPrefs,
  type PrefsPatch,
} from "../../../../src/db/repos/preferences.js";
import { ensureStudent } from "../../../../src/db/repos/students.js";

export async function preferencesRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { chatId: string } }>(
    "/chats/:chatId/preferences",
    async (req, reply) => {
      const { chatId } = req.params;
      const sql = getDb();
      const prefs = await getPrefs(sql, chatId);
      return reply.send(prefs);
    }
  );

  app.put<{ Params: { chatId: string }; Body: Record<string, unknown> }>(
    "/chats/:chatId/preferences",
    async (req, reply) => {
      const { chatId } = req.params;
      const body = req.body ?? {};
      const sql = getDb();
      await ensureStudent(sql, chatId);
      // Build PrefsPatch with hasOwnProperty semantics (lesson 2026-04-30).
      const patch: PrefsPatch = {};
      const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
      if (has("preferred_branches")) {
        const val = body.preferred_branches;
        patch.preferred_branches = Array.isArray(val) ? (val as string[]) : [];
      }
      if (has("preferred_locations")) {
        const val = body.preferred_locations;
        patch.preferred_locations = Array.isArray(val) ? (val as string[]) : [];
      }
      if (has("max_fees_lakhs")) {
        const val = body.max_fees_lakhs;
        patch.max_fees_lakhs = val == null ? null : Number(val);
      }
      if (has("tier_preference_max")) {
        const val = Number(body.tier_preference_max);
        if (val !== 1 && val !== 2 && val !== 3) {
          return reply.code(400).send({ error: "tier_preference_max must be 1, 2, or 3" });
        }
        patch.tier_preference_max = val as 1 | 2 | 3;
      }
      if (has("home_state")) {
        patch.home_state = body.home_state == null ? null : String(body.home_state);
      }
      try {
        const row = await upsertPrefs(sql, chatId, patch);
        return reply.send(row);
      } catch (err) {
        const pgErr = err as { code?: string; message?: string };
        if (pgErr.code === "23505") {
          return reply.code(409).send({ error: pgErr.message ?? "conflict" });
        }
        throw err;
      }
    }
  );
}
