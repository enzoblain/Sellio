SELECT
    m.id,
    m.name,
    b.id AS brand_id,
    b.name AS brand_name,
    AVG(s.purchase_price) AS average_purchase_price,
    AVG(s.sale_price) AS average_sale_price
FROM
    models m
    JOIN brands b ON b.id = m.brand_id
    LEFT JOIN garments g ON g.model_id = m.id
    LEFT JOIN sales s ON s.garment_id = g.id
GROUP BY
    m.id,
    m.name,
    b.id,
    b.name
ORDER BY
    m.name;
