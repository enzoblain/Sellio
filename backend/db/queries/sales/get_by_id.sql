SELECT
    s.id,
    s.purchase_price,
    s.shipping_price,
    s.listing_price,
    s.sale_price,
    extract(epoch FROM s.created_at)::bigint AS created_at,
    extract(epoch FROM s.updated_at)::bigint AS updated_at,
    g.id AS garment_id,
    m.id AS model_id,
    m.name AS model_name,
    b.id AS brand_id,
    b.name AS brand_name,
    sz.id AS size_id,
    sz.name AS size_name,
    c.id AS color_id,
    c.name AS color_name,
    COALESCE((
        SELECT
            jsonb_agg(jsonb_build_object('id', i.id, 'path', i.path, 'mime_type', i.mime_type, 'size_bytes', i.size_bytes, 'width', i.width, 'height', i.height, 'is_cover', i.is_cover)
        ORDER BY i.created_at ASC, i.id ASC)
        FROM images i
        WHERE
            i.garment_id = g.id), '[]'::jsonb) AS images,
    COALESCE((
        SELECT
            jsonb_agg(jsonb_build_object('id', ss.id, 'status_before', ss.status_before, 'status_after', ss.status_after, 'created_at', extract(epoch FROM ss.created_at)::bigint)
            ORDER BY ss.created_at ASC, ss.id ASC)
        FROM sale_status ss
        WHERE
            ss.sale_id = s.id), '[]'::jsonb) AS statuses
FROM
    sales s
    JOIN garments g ON g.id = s.garment_id
    JOIN models m ON m.id = g.model_id
    JOIN brands b ON b.id = m.brand_id
    JOIN sizes sz ON sz.id = g.size_id
    JOIN colors c ON c.id = g.color_id
WHERE
    s.id = $1::uuid;

