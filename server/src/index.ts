import Fastify from "fastify";
import { ensureMigrated } from "../../src/db/migrate.js";
import { registerRoutes } from "./api/index.js";
import { startBotIfConfigured } from "./bot/poller.js";

const PORT = parseInt(process.env.PORT ?? "8788", 10);
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const app = Fastify({ logger: true });

await ensureMigrated(DATABASE_URL);

await registerRoutes(app);

await app.ready();
app.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Counseller server listening on ${address}`);
});

startBotIfConfigured().catch((err) => {
  console.error("startBotIfConfigured failed:", err);
});
