-- Subject teacher learning areas + class teacher cohort assignments

CREATE TABLE IF NOT EXISTS user_learning_areas (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learning_area_id uuid NOT NULL REFERENCES learning_areas(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, learning_area_id)
);

CREATE TABLE IF NOT EXISTS class_teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grade_id uuid NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  class_name varchar(60) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_teacher_assignments_user_grade_class_key UNIQUE (user_id, grade_id, class_name)
);

CREATE INDEX IF NOT EXISTS class_teacher_assignments_user_id_idx ON class_teacher_assignments(user_id);
