SELECT
    b.id,
    b.name,
    AVG(s.purchase_price) AS average_purchase_price,
    AVG(s.sale_price) AS average_sale_price
FROM
    brands b
    LEFT JOIN models m ON m.brand_id = b.id
    LEFT JOIN garments g ON g.model_id = m.id
    LEFT JOIN sales s ON s.garment_id = g.id
GROUP BY
    b.id,
    b.name
ORDER BY
    b.name;

