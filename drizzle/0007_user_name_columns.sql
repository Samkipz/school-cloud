-- Add first_name and last_name columns to users for separate name storage
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name varchar(80);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_name varchar(80);

UPDATE users
SET first_name = split_part(full_name, ' ', 1)
WHERE first_name IS NULL;

UPDATE users
SET last_name = regexp_replace(full_name, '^\S+\s*', '')
WHERE last_name IS NULL;

ALTER TABLE users
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL;
