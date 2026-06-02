import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

const cache = new Map<string, NeonQueryFunction<false, false>>();

export function getClient(url: string): NeonQueryFunction<false, false> {
  let client = cache.get(url);
  if (!client) {
    client = neon(url);
    cache.set(url, client);
  }
  return client;
}
