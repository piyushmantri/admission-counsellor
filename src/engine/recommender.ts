import {
  EXAM_UNIT,
  type CutoffWithCollege,
  type ExamAttempt,
  type ExamName,
  type ExamUnit,
  type Preferences,
  type Recommendation,
} from "../types.js";

// Pick the "best" exam attempt for a given exam name:
//   - Most recent year wins (real-world: latest score is the one a college sees).
//   - Within the same year, pick the unit-best (max percentile/marks, min rank).
export function getBestAttempt(
  attempts: ExamAttempt[],
  examName: ExamName
): ExamAttempt | null {
  const filtered = attempts.filter((a) => a.exam_name === examName);
  if (filtered.length === 0) return null;
  const maxYear = Math.max(...filtered.map((a) => a.year));
  const inLatestYear = filtered.filter((a) => a.year === maxYear);
  const unit = EXAM_UNIT[examName];
  return inLatestYear.reduce((best, cur) => {
    const bestVal = pickValue(best, unit);
    const curVal = pickValue(cur, unit);
    if (bestVal === null) return cur;
    if (curVal === null) return best;
    if (unit === "rank") return curVal < bestVal ? cur : best;
    return curVal > bestVal ? cur : best;
  });
}

function pickValue(a: ExamAttempt, unit: ExamUnit): number | null {
  if (unit === "percentile") return a.percentile;
  if (unit === "rank") return a.rank;
  return a.marks;
}

function pickCutoff(c: CutoffWithCollege, unit: ExamUnit): number | null {
  if (unit === "percentile") return c.cutoff_percentile;
  if (unit === "rank") return c.cutoff_rank;
  return c.cutoff_marks;
}

export interface EligibilityResult {
  eligible: boolean;
  margin: number; // positive = comfortable; for percentile it's point delta, for rank/marks it's a fraction
}

export function eligibleAndMargin(
  examName: ExamName,
  studentValue: number,
  cutoff: CutoffWithCollege
): EligibilityResult | null {
  const unit = EXAM_UNIT[examName];
  const cutoffValue = pickCutoff(cutoff, unit);
  if (cutoffValue === null) return null;
  if (unit === "percentile") {
    return {
      eligible: studentValue >= cutoffValue,
      margin: studentValue - cutoffValue,
    };
  }
  if (unit === "rank") {
    return {
      eligible: studentValue <= cutoffValue,
      margin: (cutoffValue - studentValue) / cutoffValue,
    };
  }
  // marks
  return {
    eligible: studentValue >= cutoffValue,
    margin: (studentValue - cutoffValue) / cutoffValue,
  };
}

export function buildFitReasons(
  margin: number,
  examName: ExamName,
  branchName: string,
  collegeState: string,
  collegeTier: number,
  collegeFees: number | null,
  homeStateAdvantage: boolean,
  prefs: Preferences | null
): string[] {
  const reasons: string[] = [];
  const unit = EXAM_UNIT[examName];
  const comfortable =
    unit === "percentile" ? margin >= 5 : margin >= 0.15;
  if (comfortable) reasons.push("within_cutoff_comfortable");
  else reasons.push("within_cutoff_tight");

  if (prefs) {
    if (
      prefs.preferred_branches.length > 0 &&
      prefs.preferred_branches.some((b) =>
        branchName.toLowerCase().includes(b.toLowerCase())
      )
    ) {
      reasons.push("matches_preferred_branch");
    }
    if (
      prefs.preferred_locations.length > 0 &&
      prefs.preferred_locations.includes(collegeState)
    ) {
      reasons.push("in_preferred_location");
    }
    if (
      prefs.home_state &&
      prefs.home_state === collegeState &&
      homeStateAdvantage
    ) {
      reasons.push("in_home_state");
    }
    if (
      prefs.max_fees_lakhs !== null &&
      collegeFees !== null &&
      collegeFees <= prefs.max_fees_lakhs
    ) {
      reasons.push("under_fee_cap");
    }
    if (collegeTier <= prefs.tier_preference_max) {
      reasons.push("matches_tier");
    }
  }
  return reasons;
}

// Main recommender: pure function — caller loads inputs from DB and passes them in.
// For each cutoff row, find the student's best attempt for that exam+category;
// compute eligibility and margin; build fit_reasons; sort by
// (eligible DESC, fit_reasons.length DESC, margin DESC); take top `limit`.
export function recommend(
  attempts: ExamAttempt[],
  prefs: Preferences | null,
  cutoffs: CutoffWithCollege[],
  limit: number = 20
): Recommendation[] {
  const seen = new Map<string, Recommendation>();

  for (const cutoff of cutoffs) {
    const best = getBestAttempt(attempts, cutoff.exam_name);
    if (!best) continue;
    // Category-match: cutoff.category must equal student's attempt category.
    // Allow GEN cutoffs to be applied to non-GEN students (they could compete in
    // the general pool); but skip OBC-only cutoffs for GEN students.
    if (cutoff.category !== "GEN" && cutoff.category !== best.category) continue;
    const unit = EXAM_UNIT[cutoff.exam_name];
    const studentValue = pickValueAt(best, unit);
    if (studentValue === null) continue;

    const r = eligibleAndMargin(cutoff.exam_name, studentValue, cutoff);
    if (!r) continue;
    if (!r.eligible) continue;

    const cutoffValue = pickCutoffAt(cutoff, unit);
    if (cutoffValue === null) continue;

    const reasons = buildFitReasons(
      r.margin,
      cutoff.exam_name,
      cutoff.branch_name,
      cutoff.college_state,
      cutoff.college_tier,
      cutoff.college_annual_fees_lakhs,
      cutoff.home_state_advantage,
      prefs
    );

    // De-dupe by college+branch — keep the best (highest margin) cutoff row.
    const key = `${cutoff.college_id}::${cutoff.branch_id}::${cutoff.exam_name}`;
    const existing = seen.get(key);
    if (existing && existing.margin >= r.margin) continue;

    seen.set(key, {
      college_id: cutoff.college_id,
      college_name: cutoff.college_name,
      college_tier: cutoff.college_tier,
      branch_name: cutoff.branch_name,
      exam_used: cutoff.exam_name,
      student_value: studentValue,
      cutoff_value: cutoffValue,
      margin: r.margin,
      fit_reasons: reasons,
    });
  }

  const all = [...seen.values()];
  all.sort((a, b) => {
    // Sort by cutoff competitiveness — lower closing rank (for rank-based) or
    // higher closing percentile/marks = harder to get into = more prestigious.
    // This naturally encodes both college tier and branch prestige together.
    const examUnit = EXAM_UNIT[a.exam_used];
    const prestige =
      examUnit === "rank"
        ? a.cutoff_value - b.cutoff_value       // lower closing rank = harder
        : b.cutoff_value - a.cutoff_value;      // higher cutoff score = harder
    if (prestige !== 0) return prestige;
    // Tiebreaker: tier ASC
    return a.college_tier - b.college_tier;
  });
  return all.slice(0, limit);
}

function pickValueAt(a: ExamAttempt, unit: ExamUnit): number | null {
  if (unit === "percentile") return a.percentile;
  if (unit === "rank") return a.rank;
  return a.marks;
}

function pickCutoffAt(c: CutoffWithCollege, unit: ExamUnit): number | null {
  if (unit === "percentile") return c.cutoff_percentile;
  if (unit === "rank") return c.cutoff_rank;
  return c.cutoff_marks;
}
