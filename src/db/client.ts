import pg from "pg";
import type { NeonQueryFunction } from "@neondatabase/serverless";

const { Pool } = pg;
const poolCache = new Map<string, pg.Pool>();

function getPool(url: string): pg.Pool {
  let pool = poolCache.get(url);
  if (!pool) {
    pool = new Pool({ connectionString: url });
    poolCache.set(url, pool);
  }
  return pool;
}

function makeClient(pool: pg.Pool): NeonQueryFunction<false, false> {
  return async function sqlFn(strings: TemplateStringsArray | string, ...values: unknown[]): Promise<unknown[]> {
    let text: string;
    let params: unknown[];
    if (typeof strings === "string") {
      text = strings;
      params = (values[0] as unknown[]) ?? [];
    } else {
      text = (strings as TemplateStringsArray).reduce(
        (acc: string, str: string, i: number) => acc + (i > 0 ? `$${i}` : "") + str,
        "",
      );
      params = values;
    }
    const result = await pool.query(text, params);
    return result.rows;
  } as unknown as NeonQueryFunction<false, false>;
}

const clientCache = new Map<string, NeonQueryFunction<false, false>>();

export function getClient(url: string): NeonQueryFunction<false, false> {
  let client = clientCache.get(url);
  if (!client) {
    client = makeClient(getPool(url));
    clientCache.set(url, client);
  }
  return client;
}
