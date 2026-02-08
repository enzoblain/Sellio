CREATE TABLE sessions (
  id CHAR(26) PRIMARY KEY,
  user_id CHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  refresh_token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,

  device_label TEXT,
  last_seen_at TIMESTAMPTZ,

  CONSTRAINT sessions_id_ulid_format CHECK (id ~ '^[0-9A-HJKMNP-TV-Z]{26}$')
);

CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_expires_idx ON sessions(expires_at);
