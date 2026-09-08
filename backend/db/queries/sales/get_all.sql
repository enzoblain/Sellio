SELECT
    s.id,
    s.purchase_price,
    s.shipping_price,
    s.listing_price,
    s.sale_price,
    ss.status_after AS status,
    EXTRACT(EPOCH FROM s.updated_at)::bigint,
    g.id,
    m.id,
    m.name,
    b.id,
    b.name,
    sz.id,
    sz.name,
    c.id,
    c.name,
    i.id,
    i.path,
    i.mime_type,
    i.size_bytes,
    i.width,
    i.height,
    EXTRACT(EPOCH FROM i.created_at)::bigint
FROM
    sales s
    LEFT JOIN LATERAL (
        SELECT
            status_after
        FROM
            sale_status ss
        WHERE
            ss.sale_id = s.id
        ORDER BY
            ss.created_at DESC,
            ss.id DESC
        LIMIT 1) ss ON TRUE
    JOIN garments g ON g.id = s.garment_id
    JOIN models m ON m.id = g.model_id
    JOIN brands b ON b.id = m.brand_id
    JOIN sizes sz ON sz.id = g.size_id
    JOIN colors c ON c.id = g.color_id
    LEFT JOIN images i ON i.garment_id = g.id
        AND i.is_cover = TRUE
    ORDER BY
        s.created_at DESC;

