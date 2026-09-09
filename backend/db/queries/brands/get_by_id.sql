SELECT
    b.id,
    b.name,
    AVG(s.purchase_price) AS average_purchase_price,
    AVG(s.sale_price) AS average_sale_price,
    COALESCE((
        SELECT
            jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'average_purchase_price', model_stats.average_purchase_price, 'average_sale_price', model_stats.average_sale_price)
        ORDER BY m.name ASC)
        FROM models m
    LEFT JOIN LATERAL (
        SELECT
            AVG(s2.purchase_price) AS average_purchase_price, AVG(s2.sale_price) AS average_sale_price
        FROM garments g2
        JOIN sales s2 ON s2.garment_id = g2.id
        WHERE
            g2.model_id = m.id) model_stats ON TRUE
        WHERE
            m.brand_id = b.id), '[]'::jsonb) AS models,
    COALESCE((
        SELECT
            jsonb_agg(jsonb_build_object('id', s2.id, 'purchase_price', s2.purchase_price, 'shipping_price', s2.shipping_price, 'listing_price', s2.listing_price, 'sale_price', s2.sale_price, 'updated_at', extract(epoch FROM s2.updated_at)::bigint)
            ORDER BY s2.updated_at DESC, s2.id DESC)
    FROM sales s2
    JOIN garments g2 ON g2.id = s2.garment_id
    JOIN models m2 ON m2.id = g2.model_id
    WHERE
        m2.brand_id = b.id), '[]'::jsonb) AS sales
FROM
    brands b
    LEFT JOIN models bm ON bm.brand_id = b.id
    LEFT JOIN garments bg ON bg.model_id = bm.id
    LEFT JOIN sales s ON s.garment_id = bg.id
WHERE
    b.id = $1::uuid
GROUP BY
    b.id,
    b.name;
