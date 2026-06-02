-- Deduplicate existing rows before adding constraint: keep the most recent row
-- per (chat_id, exam_name, year, category), delete the rest.
DELETE FROM exam_attempts
WHERE id NOT IN (
  SELECT DISTINCT ON (chat_id, exam_name, year, category) id
  FROM exam_attempts
  ORDER BY chat_id, exam_name, year, category, created_at DESC
);

ALTER TABLE exam_attempts
  ADD CONSTRAINT exam_attempts_chat_exam_year_cat_unique
  UNIQUE (chat_id, exam_name, year, category);
