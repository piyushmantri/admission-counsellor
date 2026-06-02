import { EXAM_UNIT, type ExamAttempt, type StudentBundle } from "../types.js";

export function makePersonaText(): string {
  const currentYear = new Date().getFullYear();
  return [
    "[COUNSELOR-PERSONA]",
    "You are a friendly, proactive Indian engineering admissions counselor.",
    "Your job: help the student decide which colleges they can realistically target.",
    "Ask ONE or TWO short questions at a time — never overload the user.",
    "When the user provides exam scores or preferences in free text, you MUST persist",
    "them by emitting the matching slash command on its own line, e.g.:",
    `  CALL: /add-exam {"exam_name":"JEE_MAIN","year":${currentYear},"percentile":94.7,"category":"GEN"}`,
    `  CALL: /set-preferences {"preferred_branches":["CSE"],"home_state":"Maharashtra"}`,
    `The current year is ${currentYear}. Use this as the default year for exam attempts unless the student specifies a different year.`,
    "Valid exam_name values: JEE_MAIN, JEE_ADVANCED, MHT_CET, BITSAT, VITEEE, KCET, AP_EAMCET, WBJEE, NEET.",
    "Valid category values: GEN, OBC, SC, ST, EWS.",
    "Provide at least one of: marks, rank, percentile (use the unit the user gave).",
    "Once the student has at least one exam and minimal preferences (branch + location/home_state),",
    "suggest running /recommend.",
  ].join("\n");
}

export const PERSONA_TEXT = makePersonaText();

export const METHODOLOGY_TEXT = [
  "[METHODOLOGY]",
  "Recommendations are heuristic — NOT predictive admit/reject decisions.",
  "Cutoff data is a snapshot from JoSAA (national exams) and state counseling boards",
  "for years 2023 and 2024. Real cutoffs vary by round, quota, and year-on-year.",
  "Eligibility = student score meets/beats the closing cutoff for that exam+category+year.",
  "Margin = how comfortably the student is above the cutoff (positive points for percentile,",
  "fractional improvement for rank/marks). Fit reasons combine margin, branch match,",
  "location match, home-state advantage, fee cap, and tier preference.",
  "JEE Advanced note: real eligibility requires JEE Main top ~2.5L rank; the recommender",
  "does NOT enforce this — verify on the student's side.",
].join("\n");

export function formatStudentProfile(bundle: StudentBundle): string {
  const lines: string[] = ["[STUDENT-PROFILE]"];
  if (!bundle.student) {
    lines.push("No student record yet (first interaction).");
    return lines.join("\n");
  }
  lines.push(
    `Student chat_id=${bundle.student.chat_id}, default_category=${bundle.student.category}.`
  );
  if (bundle.attempts.length === 0) {
    lines.push("Exams recorded: NONE.");
  } else {
    lines.push(`Exams recorded (${bundle.attempts.length}):`);
    for (const a of bundle.attempts) {
      lines.push(`  - ${formatAttempt(a)}`);
    }
  }
  if (!bundle.prefs) {
    lines.push("Preferences: NOT SET.");
  } else {
    const p = bundle.prefs;
    const parts: string[] = [];
    parts.push(
      `branches=[${p.preferred_branches.join(", ") || "<none>"}]`
    );
    parts.push(
      `locations=[${p.preferred_locations.join(", ") || "<none>"}]`
    );
    parts.push(
      `max_fees_lakhs=${p.max_fees_lakhs === null ? "<unset>" : p.max_fees_lakhs}`
    );
    parts.push(`tier_max=${p.tier_preference_max}`);
    parts.push(`home_state=${p.home_state ?? "<unset>"}`);
    lines.push(`Preferences: ${parts.join(", ")}.`);
  }
  return lines.join("\n");
}

function formatAttempt(a: ExamAttempt): string {
  const unit = EXAM_UNIT[a.exam_name];
  const value =
    unit === "percentile"
      ? a.percentile !== null
        ? `${a.percentile} percentile`
        : `(no ${unit})`
      : unit === "rank"
        ? a.rank !== null
          ? `rank ${a.rank}`
          : `(no ${unit})`
        : a.marks !== null
          ? `${a.marks} marks`
          : `(no ${unit})`;
  return `${a.exam_name} ${a.year}: ${value} (${a.category})`;
}

export function nextStepInstruction(bundle: StudentBundle): string {
  const lines: string[] = ["[NEXT-STEP]"];
  if (!bundle.student || bundle.attempts.length === 0) {
    lines.push(
      "Ask the student which engineering entrance exams they have appeared for, what year, and what score (rank/marks/percentile) and category. Start the conversation if this is the first turn."
    );
    return lines.join("\n");
  }
  // Check for any attempt missing the unit-appropriate field.
  const missingUnit = bundle.attempts.find((a) => {
    const unit = EXAM_UNIT[a.exam_name];
    if (unit === "percentile") return a.percentile === null;
    if (unit === "rank") return a.rank === null;
    return a.marks === null;
  });
  if (missingUnit) {
    const unit = EXAM_UNIT[missingUnit.exam_name];
    lines.push(
      `The ${missingUnit.exam_name} ${missingUnit.year} attempt is missing a ${unit} value. Ask the student to provide it.`
    );
    return lines.join("\n");
  }
  if (!bundle.prefs) {
    lines.push(
      "Ask about preferences: preferred branch(es) (e.g. CSE, ECE), preferred location(s) (state names), home state, and any fee cap."
    );
    return lines.join("\n");
  }
  const p = bundle.prefs;
  if (p.preferred_branches.length === 0) {
    lines.push("Ask which engineering branches the student is interested in.");
    return lines.join("\n");
  }
  if (!p.home_state && p.preferred_locations.length === 0) {
    lines.push(
      "Ask about location preference: home state (for state-quota advantage) and any other states the student is open to."
    );
    return lines.join("\n");
  }
  lines.push(
    "Profile looks complete enough. Suggest the student run /recommend to see eligible colleges."
  );
  return lines.join("\n");
}
