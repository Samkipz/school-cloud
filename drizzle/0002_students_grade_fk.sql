-- Students reference grades via foreign key (replaces denormalized grade text).

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS grade_id uuid REFERENCES grades (id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND column_name = 'grade'
  ) THEN
    UPDATE students s
    SET grade_id = g.id
    FROM grades g
    WHERE s.grade_id IS NULL
      AND trim(s.grade) = g.name;
  END IF;
END $$;

INSERT INTO grades (id, name, sort_order)
SELECT gen_random_uuid(), 'Unassigned', 9999
WHERE NOT EXISTS (SELECT 1 FROM grades WHERE name = 'Unassigned');

UPDATE students s
SET grade_id = (SELECT id FROM grades WHERE name = 'Unassigned' LIMIT 1)
WHERE s.grade_id IS NULL;

ALTER TABLE students
  ALTER COLUMN grade_id SET NOT NULL;

ALTER TABLE students
  DROP COLUMN IF EXISTS grade;
