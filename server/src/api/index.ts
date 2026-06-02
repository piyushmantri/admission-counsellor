import type { FastifyInstance } from "fastify";
import { studentsRoutes } from "./routes/students.js";
import { examsRoutes } from "./routes/exams.js";
import { preferencesRoutes } from "./routes/preferences.js";
import { recommendationsRoutes } from "./routes/recommendations.js";
import { collegesRoutes } from "./routes/colleges.js";
import { botConfigRoutes } from "./routes/botConfig.js";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // API routes FIRST (lesson 2026-05-04)
  await app.register(studentsRoutes, { prefix: "/api" });
  await app.register(examsRoutes, { prefix: "/api" });
  await app.register(preferencesRoutes, { prefix: "/api" });
  await app.register(recommendationsRoutes, { prefix: "/api" });
  await app.register(collegesRoutes, { prefix: "/api" });
  await app.register(botConfigRoutes, { prefix: "/api" });

  // SPA static fallback (production only — web/dist must exist).
  // In dev, the Vite dev server serves the SPA on its own port.
  if (process.env.NODE_ENV === "production") {
    const { default: staticPlugin } = await import("@fastify/static");
    const { join, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const webDist = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../web/dist"
    );
    await app.register(staticPlugin, { root: webDist, prefix: "/" });
  }

  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ error: "Not found" });
  });
}
