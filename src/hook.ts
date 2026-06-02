// counseller — self-contained tele application hook.
//
// (1) DEV-ONLY .ts ASSUMPTION: this file is dynamic-imported via
//     pathToFileURL(...).href with the literal `hook.ts` filename. The current
//     dev runtime uses tsx which can import .ts directly. A future compiled
//     build must either keep the .ts source on disk or migrate BOTH call
//     sites (loadCodeAppContext + tryApplicationSlashCommand) at once.
//
// (2) DO NOT import from outside ~/spaps/counseller/src/ or tele internals —
//     the hook is intentionally framework-agnostic. Only node:* + relative
//     sibling files + @neondatabase/serverless + nanoid. This is why we use
//     `console.warn` instead of the standalone logger; introducing a tele
//     (or any cross-folder) dependency would couple the plugin to the host's
//     internals and break the "copy hook.ts to applications/<slug>/" install
//     pattern.
//
// (3) PROFILE RESOLUTION (read fresh from Neon on every getContext call):
//     The student row + exam attempts + preferences live in the Neon DB
//     pointed at by ctx.databaseUrl. The Neon serverless driver caches the
//     connection per URL (see ./db/client.ts), so the per-turn cost is one
//     round-trip per query (three queries in parallel via getStudentBundle).
//     No in-memory cache — operator edits via the standalone web dashboard
//     land on the next AI turn.
//
// (4) CUTOFF DATA: 2023+2024 snapshot from JoSAA (national exams) + respective
//     state CETs (MHT-CET, KCET, AP-EAMCET, WBJEE) + institute admissions
//     pages (BITSAT, VITEEE). See src/db/migrations/0002_seed_colleges.sql.
//     Drift caveat: real cutoffs change year-on-year, vary by round, and the
//     V1 seed covers ~30 colleges across 8 exams (~456 cutoff rows).
//     Editing is via a NEW migration (000N_seed_update.sql), NOT in-place.
//
// (5) SLASH COMMANDS:
//     - /add-exam {exam_name, year, marks|rank|percentile, category}
//     - /set-preferences {preferred_branches?, preferred_locations?,
//                         max_fees_lakhs?, tier_preference_max?, home_state?}
//       (partial JSON — only keys present in the object are written; absent
//       keys retain existing DB values; explicit null clears.)
//     - /recommend  (compute top 20 recommendations from stored data)
//     - /list-exams (show stored attempts)
//     - /clear      (delete this chat's exams + prefs; start over)
//     The AI is instructed (see PERSONA_TEXT in engine/prompts.ts) to call
//     /add-exam and /set-preferences when the user provides data in free
//     text. Direct user typing of slash commands also works.
//
// (6) METRICS POSITIONAL CONTRACT (host: apps/server/src/ai/applications.ts
//     in the tele repo — that's where emit closures are constructed via
//     makeAppEmit(slug)). The host invokes:
//       getContext(chatId, ctx?)               — ctx is the SECOND arg
//       handleSlashCommand(cmd, args, chatId, ctx?)  — ctx is the FOURTH arg
//     ctx.emit("name", value?) bumps a per-app custom counter.
//     ctx.emitTimeseries("name", value) appends a timestamped point to a
//     per-app line-chart ring (240 samples per metric, persisted to InfluxDB).
//     Defensive pattern (used below):
//       const emit = ctx?.emit ?? (() => {});
//       const emitTs = ctx?.emitTimeseries ?? (() => {});
//     All closures are no-ops when ctx is undefined — keeps the hook usable
//     from the standalone counseller server (where ctx is partial) and from
//     `tsx -e "import('./hook.js')..."` smoke tests.
//
// (7) DATABASE URL CONTRACT (NEW):
//     ctx.databaseUrl is the Neon-compatible URL injected by tele on every
//     turn (from the applications.database_url row in tele's own DB). The
//     hook never persists it, never caches it in module scope, and reads it
//     fresh from ctx so an operator-side rotation lands on the next turn.
//     If ctx?.databaseUrl is null/undefined, the hook returns a graceful
//     "not configured" message instead of throwing — this is the standalone
//     bot's fail-safe (DATABASE_URL env may not yet be set on first boot).

import { nanoid } from "nanoid";
import { getClient } from "./db/client.js";
import { ensureMigrated } from "./db/migrate.js";
import {
  createAttempt,
  deleteAllAttempts,
  listAttempts,
} from "./db/repos/examAttempts.js";
import {
  deletePrefs,
  upsertPrefs,
  type PrefsPatch,
} from "./db/repos/preferences.js";
import { loadCutoffsForExams } from "./db/repos/colleges.js";
import {
  ensureStudent,
  getStudentBundle,
} from "./db/repos/students.js";
import { recommend } from "./engine/recommender.js";
import {
  PERSONA_TEXT,
  METHODOLOGY_TEXT,
  formatStudentProfile,
  nextStepInstruction,
} from "./engine/prompts.js";
import { fetchAndUpsertRealtimeCutoffs } from "./engine/realtimeCutoffs.js";
import {
  EXAM_UNIT,
  type Category,
  type ExamName,
} from "./types.js";

// Silence the "unused" lint for nanoid — it's re-exported for symmetry with
// kundali's hook (used by callers if any). The actual nanoid call sites are
// in src/db/repos/examAttempts.ts.
void nanoid;

interface HookContext {
  emit?: (name: string, value?: number) => void;
  emitTimeseries?: (name: string, value: number) => void;
  storeResult?: (data: Record<string, unknown>) => Promise<void>;
  databaseUrl?: string | null;
  geminiApiKey?: string | null;
}

const VALID_EXAMS = new Set<ExamName>([
  "JEE_MAIN",
  "JEE_ADVANCED",
  "MHT_CET",
  "BITSAT",
  "VITEEE",
  "KCET",
  "AP_EAMCET",
  "WBJEE",
  "NEET",
]);

const VALID_CATEGORIES = new Set<Category>([
  "GEN",
  "OBC",
  "SC",
  "ST",
  "EWS",
]);

const NOT_CONFIGURED_CONTEXT = [
  PERSONA_TEXT,
  "[STATUS] Counseller is not configured: tele did not inject a database_url. Operator should set the application's database_url in the dashboard.",
  METHODOLOGY_TEXT,
].join("\n\n");

const NOT_CONFIGURED_SLASH =
  "Counseller is not configured (no database_url). Ask the operator to set it.";

export async function getContext(
  chatId: string,
  ctx?: HookContext
): Promise<string> {
  const emit = ctx?.emit ?? (() => {});
  const emitTs = ctx?.emitTimeseries ?? (() => {});
  const databaseUrl = ctx?.databaseUrl;
  const start = Date.now();

  try {
    emit("getcontext_called");
    if (!databaseUrl) {
      emit("getcontext_not_configured");
      emitTs("getcontext_duration_ms", Date.now() - start);
      return NOT_CONFIGURED_CONTEXT;
    }
    await ensureMigrated(databaseUrl);
    const sql = getClient(databaseUrl);
    await ensureStudent(sql, chatId);
    const bundle = await getStudentBundle(sql, chatId);
    if (bundle.student && bundle.attempts.length > 0) {
      emit("profile_loaded");
    } else {
      emit("profile_missing");
    }
    emitTs("getcontext_duration_ms", Date.now() - start);
    return [
      PERSONA_TEXT,
      formatStudentProfile(bundle),
      METHODOLOGY_TEXT,
      nextStepInstruction(bundle),
    ].join("\n\n");
  } catch (err) {
    console.warn(
      "[counseller] getContext failed:",
      err instanceof Error ? err.message : String(err)
    );
    emit("getcontext_error");
    emitTs("getcontext_duration_ms", Date.now() - start);
    return [
      PERSONA_TEXT,
      "[STATUS] Counseller could not load the student profile this turn (transient DB error). Continue the conversation; the next turn will retry.",
      METHODOLOGY_TEXT,
    ].join("\n\n");
  }
}

export async function handleSlashCommand(
  cmd: string,
  args: string,
  chatId: string,
  ctx?: HookContext
): Promise<string> {
  const emit = ctx?.emit ?? (() => {});
  const emitTs = ctx?.emitTimeseries ?? (() => {});
  const databaseUrl = ctx?.databaseUrl;
  const geminiApiKey = ctx?.geminiApiKey ?? null;

  if (!databaseUrl) {
    emit("slash_not_configured");
    return NOT_CONFIGURED_SLASH;
  }

  try {
    await ensureMigrated(databaseUrl);
    const sql = getClient(databaseUrl);
    await ensureStudent(sql, chatId);

    switch (cmd) {
      case "add-exam":
        return await handleAddExam(sql, chatId, args, emit);
      case "set-preferences":
        return await handleSetPreferences(sql, chatId, args, emit);
      case "recommend":
        return await handleRecommend(sql, chatId, args, emit, emitTs, geminiApiKey);
      case "list-exams":
        return await handleListExams(sql, chatId, emit);
      case "clear":
        return await handleClear(sql, chatId, emit);
      default:
        return "Unknown command.";
    }
  } catch (err) {
    if (err && typeof err === "object" && "code" in err) {
      const code = (err as { code: string }).code;
      if (code === "23505") {
        return "That record already exists. Try /list-exams to see what's stored, or /set-preferences to update.";
      }
    }
    console.warn(
      `[counseller] handleSlashCommand(${cmd}) failed:`,
      err instanceof Error ? err.message : String(err)
    );
    emit("slash_error");
    return "An error occurred. Please try again.";
  }
}

// ---------------------------------------------------------------------------
// /add-exam
// ---------------------------------------------------------------------------

const ADD_EXAM_USAGE =
  'Usage: /add-exam {"exam_name":"JEE_MAIN","year":2024,"percentile":94.7,"category":"GEN"}. ' +
  "exam_name must be one of: JEE_MAIN, JEE_ADVANCED, MHT_CET, BITSAT, VITEEE, KCET, AP_EAMCET, WBJEE, NEET. " +
  "category defaults to GEN. Provide at least one of marks, rank, percentile.";

async function handleAddExam(
  sql: ReturnType<typeof getClient>,
  chatId: string,
  args: string,
  emit: (n: string, v?: number) => void
): Promise<string> {
  const trimmed = args.trim();
  if (!trimmed) return ADD_EXAM_USAGE;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return `Could not parse JSON. ${ADD_EXAM_USAGE}`;
  }

  const examName = parsed.exam_name;
  if (typeof examName !== "string" || !VALID_EXAMS.has(examName as ExamName)) {
    return `Invalid exam_name. ${ADD_EXAM_USAGE}`;
  }
  const year = parsed.year;
  if (year !== undefined && (typeof year !== "number" || !Number.isInteger(year) || year < 1900 || year > 2100)) {
    return "year must be an integer (4-digit year).";
  }
  const resolvedYear = typeof year === "number" ? year : new Date().getFullYear();

  const marks =
    typeof parsed.marks === "number" && Number.isFinite(parsed.marks)
      ? parsed.marks
      : null;
  const rank =
    typeof parsed.rank === "number" && Number.isFinite(parsed.rank)
      ? Math.round(parsed.rank)
      : null;
  const percentile =
    typeof parsed.percentile === "number" && Number.isFinite(parsed.percentile)
      ? parsed.percentile
      : null;
  if (marks === null && rank === null && percentile === null) {
    return "Provide at least one of marks, rank, percentile (numeric).";
  }

  const categoryRaw = parsed.category;
  const category: Category =
    typeof categoryRaw === "string" && VALID_CATEGORIES.has(categoryRaw as Category)
      ? (categoryRaw as Category)
      : "GEN";

  const upserted = await createAttempt(sql, chatId, {
    exam_name: examName as ExamName,
    year: resolvedYear,
    marks,
    rank,
    percentile,
    category,
  });

  emit("exam_added");

  const valueStr =
    percentile !== null
      ? `${percentile} percentile`
      : rank !== null
        ? `rank ${rank}`
        : `${marks} marks`;
  const all = await listAttempts(sql, chatId);
  const verb = upserted.id === upserted.id ? "Updated" : "Added"; // upsert always returns existing id on conflict
  void verb; // determined by whether row existed — just say "Saved"
  return `Saved ${upserted.exam_name} ${upserted.year}: ${valueStr} (${upserted.category}). You now have ${all.length} exam attempt${all.length === 1 ? "" : "s"} recorded.`;
}

// ---------------------------------------------------------------------------
// /set-preferences
// ---------------------------------------------------------------------------

const SET_PREFS_USAGE =
  'Usage: /set-preferences {"preferred_branches":["CSE","ECE"],"preferred_locations":["Maharashtra"],"max_fees_lakhs":5,"tier_preference_max":2,"home_state":"Karnataka"}. ' +
  "All fields optional — only fields you include are updated. Pass null to clear (e.g. {\"max_fees_lakhs\":null}).";

async function handleSetPreferences(
  sql: ReturnType<typeof getClient>,
  chatId: string,
  args: string,
  emit: (n: string, v?: number) => void
): Promise<string> {
  const trimmed = args.trim();
  if (!trimmed) return SET_PREFS_USAGE;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return `Could not parse JSON. ${SET_PREFS_USAGE}`;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return SET_PREFS_USAGE;
  }

  const patch: PrefsPatch = {};
  const has = (k: string) => Object.prototype.hasOwnProperty.call(parsed, k);

  if (has("preferred_branches")) {
    const v = parsed.preferred_branches;
    if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) {
      return "preferred_branches must be an array of strings.";
    }
    patch.preferred_branches = v as string[];
  }
  if (has("preferred_locations")) {
    const v = parsed.preferred_locations;
    if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) {
      return "preferred_locations must be an array of strings.";
    }
    patch.preferred_locations = v as string[];
  }
  if (has("max_fees_lakhs")) {
    const v = parsed.max_fees_lakhs;
    if (v !== null && (typeof v !== "number" || !Number.isFinite(v))) {
      return "max_fees_lakhs must be a number or null.";
    }
    patch.max_fees_lakhs = v as number | null;
  }
  if (has("tier_preference_max")) {
    const v = parsed.tier_preference_max;
    if (v !== 1 && v !== 2 && v !== 3) {
      return "tier_preference_max must be 1, 2, or 3.";
    }
    patch.tier_preference_max = v as 1 | 2 | 3;
  }
  if (has("home_state")) {
    const v = parsed.home_state;
    if (v !== null && typeof v !== "string") {
      return "home_state must be a string or null.";
    }
    patch.home_state = v as string | null;
  }

  const saved = await upsertPrefs(sql, chatId, patch);
  emit("prefs_set");

  const summary: string[] = [];
  if (Object.prototype.hasOwnProperty.call(patch, "preferred_branches")) {
    summary.push(`branches=[${saved.preferred_branches.join(", ") || "<none>"}]`);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "preferred_locations")) {
    summary.push(
      `locations=[${saved.preferred_locations.join(", ") || "<none>"}]`
    );
  }
  if (Object.prototype.hasOwnProperty.call(patch, "max_fees_lakhs")) {
    summary.push(
      `max_fees_lakhs=${saved.max_fees_lakhs === null ? "<cleared>" : saved.max_fees_lakhs}`
    );
  }
  if (Object.prototype.hasOwnProperty.call(patch, "tier_preference_max")) {
    summary.push(`tier_preference_max=${saved.tier_preference_max}`);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "home_state")) {
    summary.push(
      `home_state=${saved.home_state === null ? "<cleared>" : saved.home_state}`
    );
  }
  return summary.length === 0
    ? "Preferences unchanged (empty patch)."
    : `Preferences updated: ${summary.join(", ")}.`;
}

// ---------------------------------------------------------------------------
// /recommend
// ---------------------------------------------------------------------------

async function handleRecommend(
  sql: ReturnType<typeof getClient>,
  chatId: string,
  args: string,
  emit: (n: string, v?: number) => void,
  emitTs: (n: string, v: number) => void,
  geminiApiKey: string | null,
): Promise<string> {
  const limitArg = parseInt(args.trim(), 10);
  const limit = Number.isFinite(limitArg) && limitArg > 0 ? Math.min(limitArg, 50) : 20;
  const start = Date.now();
  const bundle = await getStudentBundle(sql, chatId);
  if (bundle.attempts.length === 0) {
    emit("recommend_no_exams");
    return "No exams recorded yet. Use /add-exam to add your first exam attempt.";
  }
  const exams = Array.from(
    new Set(bundle.attempts.map((a) => a.exam_name))
  ) as ExamName[];
  const preferredBranches = bundle.prefs?.preferred_branches ?? [];
  const currentYear = new Date().getFullYear();

  // Fetch real-time cutoffs and upsert into DB (fire-and-wait before recommend)
  if (geminiApiKey && preferredBranches.length > 0) {
    try {
      await fetchAndUpsertRealtimeCutoffs(sql, geminiApiKey, exams, preferredBranches, currentYear);
      emit("realtime_fetch_ok");
    } catch {
      emit("realtime_fetch_error");
      // non-fatal — seed data still used
    }
  }

  // Load cutoffs fresh from DB (now includes any upserted realtime rows)
  const cutoffs = await loadCutoffsForExams(sql, exams, [], []);
  const recs = recommend(bundle.attempts, bundle.prefs, cutoffs, limit);
  emit("recommend_called");
  emitTs("recommend_duration_ms", Date.now() - start);
  if (recs.length === 0) {
    return "No matching colleges found for your current scores. Try adding more exams or double-check your scores with /list-exams.";
  }

  let display = recs;
  let prefixNote = "";

  if (preferredBranches.length > 0) {
    const matching = recs.filter((r) =>
      preferredBranches.some((b) =>
        r.branch_name.toLowerCase().includes(b.toLowerCase()),
      ),
    );
    if (matching.length > 0) {
      display = matching;
    } else {
      // None of the preferred branches qualify — explain and show alternatives
      prefixNote =
        `No eligible colleges found for your preferred branch(es): ${preferredBranches.join(", ")}. ` +
        `Your rank/score doesn't meet the cutoffs for those branches in the current dataset. ` +
        `Here are the top eligible options in other branches:\n`;
    }
  }

  const lines = display.map((r, i) => {
    const unit = EXAM_UNIT[r.exam_used];
    const studentLabel =
      unit === "percentile"
        ? `${r.student_value} pct`
        : unit === "rank"
          ? `rank ${r.student_value}`
          : `${r.student_value} marks`;
    const cutoffLabel =
      unit === "percentile"
        ? `cutoff ${r.cutoff_value} pct`
        : unit === "rank"
          ? `cutoff ${r.cutoff_value}`
          : `cutoff ${r.cutoff_value}`;
    return `${i + 1}. ${r.college_name} — ${r.branch_name} (${r.exam_used}, ${studentLabel} vs ${cutoffLabel})`;
  });
  return prefixNote + `Top ${display.length} recommendation${display.length === 1 ? "" : "s"}:\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// /list-exams
// ---------------------------------------------------------------------------

async function handleListExams(
  sql: ReturnType<typeof getClient>,
  chatId: string,
  emit: (n: string, v?: number) => void
): Promise<string> {
  const attempts = await listAttempts(sql, chatId);
  emit("list_exams_called");
  if (attempts.length === 0) return "No exams recorded yet.";
  const lines = attempts.map((a) => {
    const unit = EXAM_UNIT[a.exam_name];
    const val =
      unit === "percentile"
        ? a.percentile !== null
          ? `${a.percentile} pct`
          : "(missing percentile)"
        : unit === "rank"
          ? a.rank !== null
            ? `rank ${a.rank}`
            : "(missing rank)"
          : a.marks !== null
            ? `${a.marks} marks`
            : "(missing marks)";
    return `- ${a.exam_name} ${a.year}: ${val} (${a.category})`;
  });
  return `Recorded exams (${attempts.length}):\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// /clear
// ---------------------------------------------------------------------------

async function handleClear(
  sql: ReturnType<typeof getClient>,
  chatId: string,
  emit: (n: string, v?: number) => void
): Promise<string> {
  await deleteAllAttempts(sql, chatId);
  await deletePrefs(sql, chatId);
  emit("clear_called");
  return "All exams and preferences cleared. You can start over with /add-exam.";
}

// Called by tele's applicationBotRunner before querying bot_config, so the
// schema is guaranteed to exist without relying on tele's generic migration
// runner (which requires a valid installed_path/src/db/migrations/ dir).
export async function ensureDb(databaseUrl: string): Promise<void> {
  await ensureMigrated(databaseUrl);
}
