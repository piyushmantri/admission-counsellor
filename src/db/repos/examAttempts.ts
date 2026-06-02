import type { NeonQueryFunction } from "@neondatabase/serverless";
import { nanoid } from "nanoid";
import type { Category, ExamAttempt, ExamName } from "../../types.js";

export interface NewAttempt {
  exam_name: ExamName;
  year: number;
  marks?: number | null;
  rank?: number | null;
  percentile?: number | null;
  category?: Category;
}

export async function listAttempts(
  sql: NeonQueryFunction<false, false>,
  chatId: string
): Promise<ExamAttempt[]> {
  const rows = await sql`
    SELECT id, chat_id, exam_name, year, marks, rank, percentile, category, created_at
    FROM exam_attempts
    WHERE chat_id = ${chatId}
    ORDER BY year DESC, created_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    chat_id: r.chat_id as string,
    exam_name: r.exam_name as ExamName,
    year: Number(r.year),
    marks: r.marks === null || r.marks === undefined ? null : Number(r.marks),
    rank: r.rank === null || r.rank === undefined ? null : Number(r.rank),
    percentile:
      r.percentile === null || r.percentile === undefined
        ? null
        : Number(r.percentile),
    category: (r.category as Category) ?? "GEN",
    created_at: String(r.created_at),
  }));
}

export async function createAttempt(
  sql: NeonQueryFunction<false, false>,
  chatId: string,
  dto: NewAttempt
): Promise<ExamAttempt> {
  const id = nanoid();
  const category = dto.category ?? "GEN";
  const marks = dto.marks ?? null;
  const rank = dto.rank ?? null;
  const percentile = dto.percentile ?? null;
  const rows = await sql`
    INSERT INTO exam_attempts (id, chat_id, exam_name, year, marks, rank, percentile, category)
    VALUES (${id}, ${chatId}, ${dto.exam_name}, ${dto.year}, ${marks}, ${rank}, ${percentile}, ${category})
    ON CONFLICT (chat_id, exam_name, year, category)
    DO UPDATE SET marks = ${marks}, rank = ${rank}, percentile = ${percentile}
    RETURNING id, marks, rank, percentile, created_at
  `;
  const r = rows[0] as Record<string, unknown>;
  return {
    id: r.id as string,
    chat_id: chatId,
    exam_name: dto.exam_name,
    year: dto.year,
    marks: r.marks === null || r.marks === undefined ? null : Number(r.marks),
    rank: r.rank === null || r.rank === undefined ? null : Number(r.rank),
    percentile: r.percentile === null || r.percentile === undefined ? null : Number(r.percentile),
    category,
    created_at: String(r.created_at),
  };
}

export async function deleteAttempt(
  sql: NeonQueryFunction<false, false>,
  chatId: string,
  id: string
): Promise<boolean> {
  const result = await sql`
    DELETE FROM exam_attempts WHERE chat_id = ${chatId} AND id = ${id}
  `;
  return (result as unknown as { length?: number }).length !== 0;
}

export async function deleteAllAttempts(
  sql: NeonQueryFunction<false, false>,
  chatId: string
): Promise<void> {
  await sql`DELETE FROM exam_attempts WHERE chat_id = ${chatId}`;
}
