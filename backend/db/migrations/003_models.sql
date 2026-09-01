CREATE TABLE models (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    brand_id uuid NOT NULL REFERENCES brands (id),
    name text NOT NULL,
    UNIQUE (brand_id, name)
);
