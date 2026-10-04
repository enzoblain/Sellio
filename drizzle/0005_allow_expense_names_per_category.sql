ALTER TABLE "expense_objects" DROP CONSTRAINT "expense_objects_name_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "expense_objects_category_name_unique" ON "expense_objects" USING btree ("category_id","name");
