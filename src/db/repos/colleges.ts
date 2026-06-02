import type { NeonQueryFunction } from "@neondatabase/serverless";
import type {
  Branch,
  Category,
  College,
  Cutoff,
  CutoffWithCollege,
  ExamName,
} from "../../types.js";

export async function listColleges(
  sql: NeonQueryFunction<false, false>,
  activeOnly: boolean = true
): Promise<College[]> {
  const rows = activeOnly
    ? await sql`SELECT id, name, short_name, state, city, tier, annual_fees_lakhs, active FROM colleges WHERE active = true ORDER BY tier ASC, name ASC`
    : await sql`SELECT id, name, short_name, state, city, tier, annual_fees_lakhs, active FROM colleges ORDER BY tier ASC, name ASC`;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    short_name: (r.short_name as string | null) ?? null,
    state: r.state as string,
    city: (r.city as string | null) ?? null,
    tier: Number(r.tier),
    annual_fees_lakhs:
      r.annual_fees_lakhs === null || r.annual_fees_lakhs === undefined
        ? null
        : Number(r.annual_fees_lakhs),
    active: Boolean(r.active),
  }));
}

export async function getCollege(
  sql: NeonQueryFunction<false, false>,
  id: string
): Promise<College | null> {
  const rows = await sql`
    SELECT id, name, short_name, state, city, tier, annual_fees_lakhs, active
    FROM colleges WHERE id = ${id} AND active = true
  `;
  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
    short_name: (r.short_name as string | null) ?? null,
    state: r.state as string,
    city: (r.city as string | null) ?? null,
    tier: Number(r.tier),
    annual_fees_lakhs:
      r.annual_fees_lakhs === null || r.annual_fees_lakhs === undefined
        ? null
        : Number(r.annual_fees_lakhs),
    active: Boolean(r.active),
  };
}

export async function listBranchesForCollege(
  sql: NeonQueryFunction<false, false>,
  collegeId: string
): Promise<Branch[]> {
  const rows = await sql`
    SELECT id, college_id, name, active FROM branches
    WHERE college_id = ${collegeId} AND active = true ORDER BY name ASC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    college_id: r.college_id as string,
    name: r.name as string,
    active: Boolean(r.active),
  }));
}

export async function listCutoffsForCollege(
  sql: NeonQueryFunction<false, false>,
  collegeId: string
): Promise<Cutoff[]> {
  const rows = await sql`
    SELECT c.id, c.branch_id, c.exam_name, c.category, c.year, c.cutoff_marks, c.cutoff_rank,
           c.cutoff_percentile, c.home_state_advantage, c.round, c.source_note
    FROM cutoffs c
    JOIN branches b ON b.id = c.branch_id
    WHERE b.college_id = ${collegeId} AND b.active = true
    ORDER BY c.exam_name, c.year DESC, c.category
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    branch_id: r.branch_id as string,
    exam_name: r.exam_name as ExamName,
    category: r.category as Category,
    year: Number(r.year),
    cutoff_marks:
      r.cutoff_marks === null || r.cutoff_marks === undefined
        ? null
        : Number(r.cutoff_marks),
    cutoff_rank:
      r.cutoff_rank === null || r.cutoff_rank === undefined
        ? null
        : Number(r.cutoff_rank),
    cutoff_percentile:
      r.cutoff_percentile === null || r.cutoff_percentile === undefined
        ? null
        : Number(r.cutoff_percentile),
    home_state_advantage: Boolean(r.home_state_advantage),
    round: (r.round as string | null) ?? null,
    source_note: (r.source_note as string | null) ?? null,
  }));
}

// Single joined query feeding the recommender. Filters by exam_name IN(...)
// to avoid loading the full ~456-row cutoff table on every recommend call.
// Categories filter is optional (empty array = all categories returned).
export async function loadCutoffsForExams(
  sql: NeonQueryFunction<false, false>,
  examNames: ExamName[],
  categories: Category[],
  years: number[]
): Promise<CutoffWithCollege[]> {
  if (examNames.length === 0) return [];
  const text = `
    SELECT c.id, c.branch_id, c.exam_name, c.category, c.year,
           c.cutoff_marks, c.cutoff_rank, c.cutoff_percentile,
           c.home_state_advantage, c.round, c.source_note,
           b.name AS branch_name,
           col.id AS college_id, col.name AS college_name, col.short_name AS college_short_name,
           col.state AS college_state, col.city AS college_city, col.tier AS college_tier,
           col.annual_fees_lakhs AS college_annual_fees_lakhs
    FROM cutoffs c
    JOIN branches b ON b.id = c.branch_id AND b.active = true
    JOIN colleges col ON col.id = b.college_id AND col.active = true
    WHERE c.exam_name = ANY($1::text[])
      AND ($2::text[] = '{}' OR c.category = ANY($2::text[]))
      AND ($3::int[] = '{}' OR c.year = ANY($3::int[]))
  `;
  const rows = await sql(text, [examNames, categories, years]);
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    branch_id: r.branch_id as string,
    exam_name: r.exam_name as ExamName,
    category: r.category as Category,
    year: Number(r.year),
    cutoff_marks:
      r.cutoff_marks === null || r.cutoff_marks === undefined
        ? null
        : Number(r.cutoff_marks),
    cutoff_rank:
      r.cutoff_rank === null || r.cutoff_rank === undefined
        ? null
        : Number(r.cutoff_rank),
    cutoff_percentile:
      r.cutoff_percentile === null || r.cutoff_percentile === undefined
        ? null
        : Number(r.cutoff_percentile),
    home_state_advantage: Boolean(r.home_state_advantage),
    round: (r.round as string | null) ?? null,
    source_note: (r.source_note as string | null) ?? null,
    branch_name: r.branch_name as string,
    college_id: r.college_id as string,
    college_name: r.college_name as string,
    college_short_name: (r.college_short_name as string | null) ?? null,
    college_state: r.college_state as string,
    college_city: (r.college_city as string | null) ?? null,
    college_tier: Number(r.college_tier),
    college_annual_fees_lakhs:
      r.college_annual_fees_lakhs === null ||
      r.college_annual_fees_lakhs === undefined
        ? null
        : Number(r.college_annual_fees_lakhs),
  }));
}
