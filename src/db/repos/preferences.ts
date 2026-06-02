import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { Preferences } from "../../types.js";

export interface PrefsPatch {
  preferred_branches?: string[];
  preferred_locations?: string[];
  max_fees_lakhs?: number | null;
  tier_preference_max?: 1 | 2 | 3;
  home_state?: string | null;
}

export async function getPrefs(
  sql: NeonQueryFunction<false, false>,
  chatId: string
): Promise<Preferences | null> {
  const rows = await sql`
    SELECT chat_id, preferred_branches, preferred_locations, max_fees_lakhs,
           tier_preference_max, home_state, updated_at
    FROM preferences WHERE chat_id = ${chatId}
  `;
  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    chat_id: r.chat_id as string,
    preferred_branches: Array.isArray(r.preferred_branches)
      ? (r.preferred_branches as string[])
      : [],
    preferred_locations: Array.isArray(r.preferred_locations)
      ? (r.preferred_locations as string[])
      : [],
    max_fees_lakhs:
      r.max_fees_lakhs === null || r.max_fees_lakhs === undefined
        ? null
        : Number(r.max_fees_lakhs),
    tier_preference_max:
      (Number(r.tier_preference_max) as Preferences["tier_preference_max"]) ?? 3,
    home_state: (r.home_state as string | null) ?? null,
    updated_at: String(r.updated_at),
  };
}

// Merge an incoming partial against the existing row using hasOwnProperty
// semantics: absent key -> retain DB value; key present (even null) -> write.
// Lesson 2026-04-30: "distinguish key absent from key present, value null".
export async function upsertPrefs(
  sql: NeonQueryFunction<false, false>,
  chatId: string,
  patch: PrefsPatch
): Promise<Preferences> {
  const existing = await getPrefs(sql, chatId);
  const has = (k: string) => Object.prototype.hasOwnProperty.call(patch, k);

  const preferred_branches = has("preferred_branches")
    ? patch.preferred_branches ?? []
    : existing?.preferred_branches ?? [];
  const preferred_locations = has("preferred_locations")
    ? patch.preferred_locations ?? []
    : existing?.preferred_locations ?? [];
  const max_fees_lakhs = has("max_fees_lakhs")
    ? patch.max_fees_lakhs ?? null
    : existing?.max_fees_lakhs ?? null;
  const tier_preference_max = has("tier_preference_max")
    ? patch.tier_preference_max ?? 3
    : existing?.tier_preference_max ?? 3;
  const home_state = has("home_state")
    ? patch.home_state ?? null
    : existing?.home_state ?? null;

  const branchesJson = JSON.stringify(preferred_branches);
  const locationsJson = JSON.stringify(preferred_locations);

  await sql`
    INSERT INTO preferences (chat_id, preferred_branches, preferred_locations, max_fees_lakhs, tier_preference_max, home_state, updated_at)
    VALUES (${chatId}, ${branchesJson}::jsonb, ${locationsJson}::jsonb, ${max_fees_lakhs}, ${tier_preference_max}, ${home_state}, now())
    ON CONFLICT (chat_id) DO UPDATE SET
      preferred_branches = EXCLUDED.preferred_branches,
      preferred_locations = EXCLUDED.preferred_locations,
      max_fees_lakhs = EXCLUDED.max_fees_lakhs,
      tier_preference_max = EXCLUDED.tier_preference_max,
      home_state = EXCLUDED.home_state,
      updated_at = now()
  `;
  return {
    chat_id: chatId,
    preferred_branches,
    preferred_locations,
    max_fees_lakhs,
    tier_preference_max,
    home_state,
    updated_at: new Date().toISOString(),
  };
}

export async function deletePrefs(
  sql: NeonQueryFunction<false, false>,
  chatId: string
): Promise<void> {
  await sql`DELETE FROM preferences WHERE chat_id = ${chatId}`;
}
