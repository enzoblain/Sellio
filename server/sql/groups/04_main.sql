CREATE TABLE groups (
  id CHAR(26) PRIMARY KEY,
  name TEXT NOT NULL,
  
  created_by CHAR(26) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT groups_id_ulid_format CHECK (id ~ '^[0-9A-HJKMNP-TV-Z]{26}$')
);
