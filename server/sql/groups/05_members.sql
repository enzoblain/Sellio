CREATE TABLE group_members (
  group_id CHAR(26) NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id  CHAR(26) NOT NULL REFERENCES users(id)  ON DELETE CASCADE,

  role TEXT NOT NULL DEFAULT 'member',

  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (group_id, user_id),

  CONSTRAINT group_members_role_check CHECK (role IN ('owner','admin','member','viewer'))
);
