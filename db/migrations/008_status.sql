CREATE TABLE sale_statuses (
    id smallint PRIMARY KEY,
    name text NOT NULL UNIQUE
);

INSERT INTO sale_statuses (id, name)
VALUES
    (0, 'purchased'),
    (1, 'listed'),
    (2, 'to_ship'),
    (3, 'shipped'),
    (4, 'completed'),
    (5, 'returned');

CREATE TABLE sale_status (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    sale_id uuid NOT NULL REFERENCES sales (id) ON DELETE CASCADE,
    status_before smallint REFERENCES sale_statuses (id),
    status_after smallint NOT NULL REFERENCES sale_statuses (id),
    created_at timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT sale_status_different CHECK (status_before IS NULL OR status_before <> status_after)
);
