CREATE TABLE group_invites (
  id CHAR(26) PRIMARY KEY,
  group_id CHAR(26) NOT NULL REFERENCES groups(id) ON DELETE CASCADE,

  member_id CHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',

  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ NULL,

  created_by CHAR(26) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT group_invites_id_ulid_format CHECK (id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  CONSTRAINT group_invites_role_check CHECK (role IN ('admin','member','viewer'))
);

CREATE INDEX group_invites_group_idx ON group_invites(group_id);
CREATE INDEX group_invites_member_idx ON group_invites(member_id);
