CREATE TABLE IF NOT EXISTS learning_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(80) NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO learning_areas (name, sort_order)
VALUES
  ('Biology', 10),
  ('Mathematics', 20),
  ('English', 30),
  ('Chemistry', 40),
  ('Physics', 50),
  ('Kiswahili', 60),
  ('History', 70),
  ('Geography', 80),
  ('Business Studies', 90),
  ('Computer Studies', 100)
ON CONFLICT (name) DO NOTHING;
