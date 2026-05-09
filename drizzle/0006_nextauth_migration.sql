-- Add username and password_hash to users table for NextAuth migration
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username varchar(80) UNIQUE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash text;
