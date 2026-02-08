CREATE TABLE items (
  id CHAR(26) PRIMARY KEY,
  group_id CHAR(26) NOT NULL REFERENCES groups(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  notes TEXT,

  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  bought_marketplace_id INTEGER REFERENCES marketplaces(id) ON DELETE SET NULL,
  sold_marketplace_id INTEGER REFERENCES marketplaces(id) ON DELETE SET NULL,

  bought_price_cents INTEGER,
  shipping_fees_cents INTEGER,
  bought_at TIMESTAMPTZ,

  listed_at TIMESTAMPTZ,
  sold_price_cents INTEGER,
  sold_at TIMESTAMPTZ,

  created_by CHAR(26) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT items_id_ulid_format CHECK (id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  CONSTRAINT items_prices_positive_check CHECK (
    (bought_price_cents IS NULL OR bought_price_cents >= 0) AND
    (shipping_fees_cents IS NULL OR shipping_fees_cents >= 0) AND
    (sold_price_cents IS NULL OR sold_price_cents >= 0)
  ),
  CONSTRAINT items_dates_logic_check CHECK (
    (sold_at IS NULL OR listed_at IS NOT NULL) AND
    (listed_at IS NULL OR bought_at IS NOT NULL)
  )
);

CREATE INDEX items_group_idx ON items(group_id);
CREATE INDEX items_created_by_idx ON items(created_by);
CREATE INDEX items_bought_at_idx ON items(bought_at);
CREATE INDEX items_sold_at_idx ON items(sold_at);
