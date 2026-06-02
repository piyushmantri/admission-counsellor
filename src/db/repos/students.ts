import type { NeonQueryFunction } from "@neondatabase/serverless";
import type {
  ExamAttempt,
  Preferences,
  Student,
  StudentBundle,
} from "../../types.js";

export async function ensureStudent(
  sql: NeonQueryFunction<false, false>,
  chatId: string
): Promise<void> {
  await sql`INSERT INTO students (chat_id) VALUES (${chatId}) ON CONFLICT (chat_id) DO NOTHING`;
}

export async function getStudent(
  sql: NeonQueryFunction<false, false>,
  chatId: string
): Promise<Student | null> {
  const rows = await sql`SELECT chat_id, name, category, created_at FROM students WHERE chat_id = ${chatId}`;
  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    chat_id: r.chat_id as string,
    name: (r.name as string | null) ?? null,
    category: (r.category as Student["category"]) ?? "GEN",
    created_at: String(r.created_at),
  };
}

export async function getStudentBundle(
  sql: NeonQueryFunction<false, false>,
  chatId: string
): Promise<StudentBundle> {
  const [studentRows, attemptRows, prefsRows] = await Promise.all([
    sql`SELECT chat_id, name, category, created_at FROM students WHERE chat_id = ${chatId}`,
    sql`SELECT id, chat_id, exam_name, year, marks, rank, percentile, category, created_at FROM exam_attempts WHERE chat_id = ${chatId} ORDER BY year DESC, created_at DESC`,
    sql`SELECT chat_id, preferred_branches, preferred_locations, max_fees_lakhs, tier_preference_max, home_state, updated_at FROM preferences WHERE chat_id = ${chatId}`,
  ]);
  const student = studentRows.length
    ? (() => {
        const r = studentRows[0] as Record<string, unknown>;
        return {
          chat_id: r.chat_id as string,
          name: (r.name as string | null) ?? null,
          category: (r.category as Student["category"]) ?? "GEN",
          created_at: String(r.created_at),
        };
      })()
    : null;
  const attempts = (attemptRows as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    chat_id: r.chat_id as string,
    exam_name: r.exam_name as ExamAttempt["exam_name"],
    year: Number(r.year),
    marks: r.marks === null || r.marks === undefined ? null : Number(r.marks),
    rank: r.rank === null || r.rank === undefined ? null : Number(r.rank),
    percentile:
      r.percentile === null || r.percentile === undefined
        ? null
        : Number(r.percentile),
    category: (r.category as ExamAttempt["category"]) ?? "GEN",
    created_at: String(r.created_at),
  }));
  const prefs = prefsRows.length
    ? (() => {
        const r = prefsRows[0] as Record<string, unknown>;
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
            (Number(r.tier_preference_max) as Preferences["tier_preference_max"]) ??
            3,
          home_state: (r.home_state as string | null) ?? null,
          updated_at: String(r.updated_at),
        } as Preferences;
      })()
    : null;
  return { student, attempts, prefs };
}
