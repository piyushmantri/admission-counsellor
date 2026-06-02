export type ExamName =
  | "JEE_MAIN"
  | "JEE_ADVANCED"
  | "MHT_CET"
  | "BITSAT"
  | "VITEEE"
  | "KCET"
  | "AP_EAMCET"
  | "WBJEE"
  | "NEET";

export type Category = "GEN" | "OBC" | "SC" | "ST" | "EWS";

export type ExamUnit = "percentile" | "rank" | "marks";

export const EXAM_UNIT: Record<ExamName, ExamUnit> = {
  JEE_MAIN: "percentile",
  MHT_CET: "percentile",
  JEE_ADVANCED: "rank",
  BITSAT: "marks",
  VITEEE: "rank",
  KCET: "rank",
  AP_EAMCET: "rank",
  WBJEE: "rank",
  NEET: "rank",
};

export interface ExamAttempt {
  id: string;
  chat_id: string;
  exam_name: ExamName;
  year: number;
  marks: number | null;
  rank: number | null;
  percentile: number | null;
  category: Category;
  created_at: string;
}

export interface Preferences {
  chat_id: string;
  preferred_branches: string[];
  preferred_locations: string[];
  max_fees_lakhs: number | null;
  tier_preference_max: 1 | 2 | 3;
  home_state: string | null;
  updated_at: string;
}

export interface College {
  id: string;
  name: string;
  short_name: string | null;
  state: string;
  city: string | null;
  tier: number;
  annual_fees_lakhs: number | null;
  active: boolean;
}

export interface Branch {
  id: string;
  college_id: string;
  name: string;
  active: boolean;
}

export interface Cutoff {
  id: string;
  branch_id: string;
  exam_name: ExamName;
  category: Category;
  year: number;
  cutoff_marks: number | null;
  cutoff_rank: number | null;
  cutoff_percentile: number | null;
  home_state_advantage: boolean;
  round: string | null;
  source_note: string | null;
}

export interface CutoffWithCollege extends Cutoff {
  college_id: string;
  college_name: string;
  college_short_name: string | null;
  college_state: string;
  college_city: string | null;
  college_tier: number;
  college_annual_fees_lakhs: number | null;
  branch_name: string;
}

export interface Recommendation {
  college_id: string;
  college_name: string;
  college_tier: number;
  branch_name: string;
  exam_used: ExamName;
  student_value: number;
  cutoff_value: number;
  margin: number;
  fit_reasons: string[];
}

export interface Student {
  chat_id: string;
  name: string | null;
  category: Category;
  created_at: string;
}

export interface StudentBundle {
  student: Student | null;
  attempts: ExamAttempt[];
  prefs: Preferences | null;
}
