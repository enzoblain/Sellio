CREATE TABLE notifications (
  id CHAR(26) PRIMARY KEY,
  user_id CHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  type TEXT NOT NULL,

  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,

  CONSTRAINT notifications_type_check CHECK (
    type IN (
      'item_add',
      'item_update',
      'invite',
      'invite_accepted',
      'invite_refused',
      'invite_expired'
    )
  )
);

CREATE INDEX notifications_user_idx ON notifications(user_id);
CREATE INDEX notifications_is_read_idx ON notifications(is_read);
