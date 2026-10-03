ALTER TABLE "expenses" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE "expenses" SET "created_at" = ("date"::timestamp AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'UTC' WHERE "date" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "date";
