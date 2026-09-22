SELECT
    m.id,
    m.name,
    b.id,
    b.name,
    AVG(s.purchase_price) AS average_purchase_price,
    AVG(s.sale_price) AS average_sale_price,
    COALESCE((
        SELECT
            jsonb_agg(jsonb_build_object('id', s2.id, 'purchase_price', s2.purchase_price, 'shipping_price', s2.shipping_price, 'listing_price', s2.listing_price, 'sale_price', s2.sale_price, 'updated_at', extract(epoch FROM s2.updated_at)::bigint)
        ORDER BY s2.updated_at DESC, s2.id DESC)
        FROM sales s2
        JOIN garments g2 ON g2.id = s2.garment_id
        WHERE
            g2.model_id = m.id), '[]'::jsonb) AS sales
FROM
    models m
    JOIN brands b ON b.id = m.brand_id
    LEFT JOIN garments g ON g.model_id = m.id
    LEFT JOIN sales s ON s.garment_id = g.id
WHERE
    m.id = $1::uuid
GROUP BY
    m.id,
    m.name,
    b.id,
    b.name;
