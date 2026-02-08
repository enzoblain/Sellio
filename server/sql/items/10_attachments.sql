CREATE TABLE item_attachments (
  id CHAR(26) PRIMARY KEY,
  item_id CHAR(26) NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  uploaded_by CHAR(26) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  mime_type TEXT NOT NULL,

  is_primary BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT item_attachments_id_ulid_format CHECK (id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  CONSTRAINT item_attachments_mime_type_check CHECK (mime_type ~* '^image\/(png|jpe?g|webp|gif)$')
);

CREATE INDEX item_attachments_item_idx ON item_attachments(item_id);
CREATE UNIQUE INDEX item_attachments_primary_uq ON item_attachments(item_id) WHERE is_primary = TRUE;
