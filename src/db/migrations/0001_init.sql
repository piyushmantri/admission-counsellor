CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  chat_id TEXT PRIMARY KEY,
  name TEXT,
  category TEXT NOT NULL DEFAULT 'GEN',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES students(chat_id) ON DELETE CASCADE,
  exam_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  marks REAL,
  rank INTEGER,
  percentile REAL,
  category TEXT NOT NULL DEFAULT 'GEN',
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (marks IS NOT NULL OR rank IS NOT NULL OR percentile IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS preferences (
  chat_id TEXT PRIMARY KEY REFERENCES students(chat_id) ON DELETE CASCADE,
  preferred_branches JSONB NOT NULL DEFAULT '[]',
  preferred_locations JSONB NOT NULL DEFAULT '[]',
  max_fees_lakhs REAL,
  tier_preference_max INTEGER NOT NULL DEFAULT 3,
  home_state TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS colleges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  state TEXT NOT NULL,
  city TEXT,
  tier INTEGER NOT NULL DEFAULT 3,
  annual_fees_lakhs REAL,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS cutoffs (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  exam_name TEXT NOT NULL,
  category TEXT NOT NULL,
  year INTEGER NOT NULL,
  cutoff_marks REAL,
  cutoff_rank INTEGER,
  cutoff_percentile REAL,
  home_state_advantage BOOLEAN NOT NULL DEFAULT false,
  round TEXT,
  source_note TEXT
);

CREATE INDEX IF NOT EXISTS cutoffs_exam_year_cat ON cutoffs(exam_name, year, category);
CREATE INDEX IF NOT EXISTS cutoffs_branch_id ON cutoffs(branch_id);
CREATE INDEX IF NOT EXISTS exam_attempts_chat_id ON exam_attempts(chat_id);
CREATE INDEX IF NOT EXISTS branches_college_id ON branches(college_id);
