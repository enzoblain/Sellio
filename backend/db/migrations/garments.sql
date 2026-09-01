CREATE TABLE garments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    model_id uuid NOT NULL REFERENCES models (id),
    size_id uuid NOT NULL REFERENCES sizes (id),
    color_id uuid NOT NULL REFERENCES colors (id)
);
