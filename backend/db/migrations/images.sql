CREATE TABLE images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid () path text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    width int,
    height int,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);
