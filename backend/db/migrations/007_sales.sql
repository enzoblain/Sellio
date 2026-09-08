CREATE TABLE sales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    garment_id uuid NOT NULL UNIQUE REFERENCES garments (id),
    purchase_price bigint NOT NULL,
    shipping_price bigint NOT NULL DEFAULT 0,
    listing_price bigint NOT NULL,
    sale_price bigint,
    created_at timestamp NOT NULL DEFAULT NOW(),
    updated_at timestamp NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at ()
    RETURNS TRIGGER
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$
LANGUAGE plpgsql;

CREATE TRIGGER sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at ();
