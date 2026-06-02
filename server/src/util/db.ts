import type { NeonQueryFunction } from "@neondatabase/serverless";
import { getClient } from "../../../src/db/client.js";

let _client: NeonQueryFunction<false, false> | null = null;

export function getDb(): NeonQueryFunction<false, false> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL env var is required");
  if (!_client) _client = getClient(url);
  return _client;
}

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL env var is required");
  return url;
}
