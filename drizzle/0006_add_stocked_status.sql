INSERT INTO "listing_statuses" ("id", "name") VALUES (6, 'stocked') ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "listing_status_history" ("listing_id", "status", "created_at")
SELECT "listing_id", 6, GREATEST(CURRENT_TIMESTAMP::timestamp, "created_at" + INTERVAL '1 millisecond')
FROM (
    SELECT DISTINCT ON ("listing_id") "listing_id", "status", "created_at"
    FROM "listing_status_history"
    ORDER BY "listing_id", "created_at" DESC, "id" DESC
) AS "latest"
WHERE "status" = 1;
