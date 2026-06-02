import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { CutoffWithCollege, ExamName } from "../types.js";

interface RealtimeRow {
  college_name: string;
  short_name?: string;
  state: string;
  city?: string;
  tier?: number;
  branch_name: string;
  exam_name: string;
  category: string;
  year: number;
  closing_rank?: number | null;
  closing_percentile?: number | null;
  closing_marks?: number | null;
}

// Slugify a string into a stable DB id.
function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

function collegeId(collegeName: string): string {
  return slug(collegeName);
}

function branchId(collegeName: string, branchName: string): string {
  return `${slug(collegeName)}_${slug(branchName)}`.slice(0, 80);
}

function cutoffId(
  collegeName: string,
  branchName: string,
  examName: string,
  category: string,
  year: number,
): string {
  return `${slug(collegeName)}_${slug(branchName)}_${slug(examName)}_${slug(category)}_${year}`;
}

// Upsert fetched rows into colleges/branches/cutoffs tables and return as
// CutoffWithCollege[] so recommend() can merge them with seed data.
async function upsertRows(
  sql: NeonQueryFunction<false, false>,
  rows: RealtimeRow[],
): Promise<CutoffWithCollege[]> {
  const results: CutoffWithCollege[] = [];

  for (const row of rows) {
    const cid = collegeId(row.college_name);
    const bid = branchId(row.college_name, row.branch_name);
    const tier = row.tier ?? 1;
    const fees = null;

    // Upsert college
    await sql(
      `INSERT INTO colleges (id, name, short_name, state, city, tier, annual_fees_lakhs, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, state = EXCLUDED.state, tier = EXCLUDED.tier`,
      [cid, row.college_name, row.short_name ?? null, row.state, row.city ?? null, tier, fees],
    );

    // Upsert branch
    await sql(
      `INSERT INTO branches (id, college_id, name, active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [bid, cid, row.branch_name],
    );

    const eid = cutoffId(row.college_name, row.branch_name, row.exam_name, row.category, row.year);
    const rank = row.closing_rank ?? null;
    const pct = row.closing_percentile ?? null;
    const marks = row.closing_marks ?? null;
    if (rank === null && pct === null && marks === null) continue;

    // Upsert cutoff
    await sql(
      `INSERT INTO cutoffs (id, branch_id, exam_name, category, year, cutoff_marks, cutoff_rank, cutoff_percentile, home_state_advantage)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
       ON CONFLICT (id) DO UPDATE SET cutoff_rank = EXCLUDED.cutoff_rank, cutoff_percentile = EXCLUDED.cutoff_percentile, cutoff_marks = EXCLUDED.cutoff_marks`,
      [eid, bid, row.exam_name, row.category, row.year, marks, rank, pct],
    );

    results.push({
      id: eid,
      branch_id: bid,
      exam_name: row.exam_name as ExamName,
      category: row.category as "GEN",
      year: row.year,
      cutoff_marks: marks,
      cutoff_rank: rank,
      cutoff_percentile: pct,
      home_state_advantage: false,
      round: null,
      source_note: "realtime",
      branch_name: row.branch_name,
      college_id: cid,
      college_name: row.college_name,
      college_short_name: row.short_name ?? null,
      college_state: row.state,
      college_city: row.city ?? null,
      college_tier: tier,
      college_annual_fees_lakhs: null,
    });
  }

  return results;
}

// Fetch real-time JEE cutoffs via Gemini Search grounding and upsert into DB.
// Returns supplementary CutoffWithCollege[] to merge with seed results.
export async function fetchAndUpsertRealtimeCutoffs(
  sql: NeonQueryFunction<false, false>,
  geminiApiKey: string,
  examNames: ExamName[],
  branches: string[],
  year: number,
): Promise<CutoffWithCollege[]> {
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: [{ googleSearch: {} } as never],
  });

  const examList = examNames.join(", ");
  const branchList = branches.join(", ");
  const prompt =
    `Search for official JoSAA/CSAB ${year} closing ranks for the following branches: ${branchList}. ` +
    `Exams: ${examList}. Category: GEN. Include all colleges. ` +
    `Return ONLY a valid JSON array, no markdown, no explanation. Each element must have: ` +
    `college_name (full official name), short_name, state, city, tier (1=IIT/NIT top, 2=NIT/IIIT, 3=others), ` +
    `branch_name, exam_name (one of: ${examList}), category (GEN), year (${year}), closing_rank (integer or null), ` +
    `closing_percentile (number or null), closing_marks (number or null). ` +
    `Example: [{"college_name":"Indian Institute of Technology Bombay","short_name":"IIT Bombay","state":"Maharashtra","city":"Mumbai","tier":1,"branch_name":"Computer Science and Engineering","exam_name":"JEE_ADVANCED","category":"GEN","year":${year},"closing_rank":67,"closing_percentile":null,"closing_marks":null}]`;

  let raw = "";
  try {
    const result = await model.generateContent(prompt);
    raw = result.response.text();
  } catch (err) {
    console.warn("[counseller] realtime fetch failed:", err instanceof Error ? err.message : String(err));
    return [];
  }

  // Extract JSON array from response (may be wrapped in markdown)
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) {
    console.warn("[counseller] realtime: no JSON array in response");
    return [];
  }

  let rows: RealtimeRow[];
  try {
    rows = JSON.parse(match[0]) as RealtimeRow[];
  } catch (err) {
    console.warn("[counseller] realtime: JSON parse failed:", err instanceof Error ? err.message : String(err));
    return [];
  }

  if (!Array.isArray(rows) || rows.length === 0) return [];

  try {
    return await upsertRows(sql, rows);
  } catch (err) {
    console.warn("[counseller] realtime: upsert failed:", err instanceof Error ? err.message : String(err));
    return [];
  }
}
