CREATE TABLE images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    garment_id uuid NOT NULL REFERENCES garments (id) ON DELETE CASCADE,
    path text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    width int,
    height int,
    is_cover boolean NOT NULL DEFAULT FALSE,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX images_one_cover_per_garment ON images (garment_id)
WHERE
    is_cover = TRUE;

