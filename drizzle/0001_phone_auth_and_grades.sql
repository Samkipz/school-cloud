-- Phone-based auth support + Grades CRUD

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone varchar(40);

-- Allow phone-only identities (email optional).
ALTER TABLE users
  ALTER COLUMN email DROP NOT NULL;

-- Ensure phone uniqueness when present.
DO $$ BEGIN
  CREATE UNIQUE INDEX users_phone_key ON users(phone) WHERE phone IS NOT NULL;
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(60) NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

