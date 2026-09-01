CREATE TABLE images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    garment_id uuid NOT NULL REFERENCES garments (id) ON DELETE CASCADE,
    path text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    width int,
    height int,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
