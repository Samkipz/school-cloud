ALTER TABLE learning_areas
  ADD COLUMN IF NOT EXISTS grade_id uuid REFERENCES grades(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS learning_areas_grade_id_idx ON learning_areas(grade_id);
