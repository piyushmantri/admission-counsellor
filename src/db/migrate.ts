import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getClient } from "./client.js";

// Per-process memo: once a URL has been migrated, skip the applied-set query
// on subsequent calls within the same process lifetime.
const migratedUrls = new Set<string>();

export async function ensureMigrated(url: string): Promise<void> {
  if (migratedUrls.has(url)) return;
  const sql = getClient(url);
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())`;
  const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "migrations");
  const files = (await readdir(migrationsDir))
    .filter((f: string) => f.endsWith(".sql"))
    .sort();
  const appliedRows = await sql`SELECT filename FROM schema_migrations`;
  const applied = new Set(
    appliedRows.map((r: Record<string, string>) => r.filename)
  );
  for (const file of files) {
    if (applied.has(file)) continue;
    const text = await readFile(join(migrationsDir, file), "utf8");
    // CRITICAL (lesson 2026-04-28): Neon serverless driver rejects multi-statement
    // strings via `sql.unsafe`. Split the file on `;`, strip `-- comments`, and
    // execute each statement individually via `sql(stmt, [])`.
    const statements = text
      .split("\n")
      .map((line: string) => line.replace(/--.*$/, ""))
      .join("\n")
      .split(";")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    for (const stmt of statements) {
      await sql(stmt + ";", []);
    }
    await sql`INSERT INTO schema_migrations (filename) VALUES (${file})`;
  }
  migratedUrls.add(url);
}
