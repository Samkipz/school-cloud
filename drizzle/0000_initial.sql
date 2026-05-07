DO $$ BEGIN
  CREATE TYPE role AS ENUM ('admin', 'teacher', 'marketing', 'student');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE module AS ENUM ('portfolio', 'resources', 'media', 'tools');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE visibility AS ENUM ('private', 'internal', 'public');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('raw', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(180) NOT NULL,
  email varchar(180) NOT NULL UNIQUE,
  role role NOT NULL DEFAULT 'teacher',
  department varchar(120),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_number varchar(60) NOT NULL UNIQUE,
  full_name varchar(180) NOT NULL,
  grade varchar(30) NOT NULL,
  class_name varchar(60),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(80) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module module NOT NULL,
  title varchar(180) NOT NULL,
  description text,
  grade varchar(30),
  department varchar(120),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module module NOT NULL,
  title varchar(180) NOT NULL,
  description text,
  storage_key text NOT NULL,
  mime_type varchar(120) NOT NULL,
  file_size_bytes integer NOT NULL,
  visibility visibility NOT NULL DEFAULT 'internal',
  approval_status approval_status NOT NULL DEFAULT 'raw',
  uploaded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collection_assets (
  collection_id uuid NOT NULL REFERENCES collections(id),
  asset_id uuid NOT NULL REFERENCES assets(id),
  linked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, asset_id)
);

CREATE TABLE IF NOT EXISTS asset_tags (
  asset_id uuid NOT NULL REFERENCES assets(id),
  tag_id uuid NOT NULL REFERENCES tags(id),
  PRIMARY KEY (asset_id, tag_id)
);

CREATE TABLE IF NOT EXISTS asset_students (
  asset_id uuid NOT NULL REFERENCES assets(id),
  student_id uuid NOT NULL REFERENCES students(id),
  PRIMARY KEY (asset_id, student_id)
);

CREATE TABLE IF NOT EXISTS versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id),
  version_number integer NOT NULL,
  notes text,
  storage_key text NOT NULL,
  changed_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, version_number)
);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module module NOT NULL,
  role role NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_upload boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_approve boolean NOT NULL DEFAULT false,
  UNIQUE (module, role)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id),
  action varchar(120) NOT NULL,
  entity_type varchar(120) NOT NULL,
  entity_id uuid,
  metadata text,
  created_at timestamptz NOT NULL DEFAULT now()
);
