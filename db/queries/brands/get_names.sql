SELECT
    name
FROM
    brands
WHERE
    name ILIKE $1 || '%'
ORDER BY
    name OFFSET $2
LIMIT $3;
