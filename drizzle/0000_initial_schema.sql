CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "brands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "colors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "colors_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid,
	"name" text NOT NULL,
	CONSTRAINT "brand_and_name" UNIQUE("brand_id","name")
);
--> statement-breakpoint
CREATE TABLE "sizes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "sizes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "garments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"size_id" uuid NOT NULL,
	"color_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"garment_id" uuid NOT NULL,
	"path" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"is_cover" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stocking_places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "stocking_places_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"garment_id" uuid NOT NULL,
	"purchase_price" bigint NOT NULL,
	"shipping_price" bigint DEFAULT 0 NOT NULL,
	"listing_price" bigint,
	"sale_price" bigint,
	"stocking_place_id" uuid
);
--> statement-breakpoint
CREATE TABLE "listing_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"status" smallint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_statuses" (
	"id" smallint PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "listing_statuses_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "expense_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "expense_objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "expense_objects_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_id" uuid NOT NULL,
	"price" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"code" char(4) NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "garments" ADD CONSTRAINT "garments_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "garments" ADD CONSTRAINT "garments_size_id_sizes_id_fk" FOREIGN KEY ("size_id") REFERENCES "public"."sizes"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "garments" ADD CONSTRAINT "garments_color_id_colors_id_fk" FOREIGN KEY ("color_id") REFERENCES "public"."colors"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_garment_id_garments_id_fk" FOREIGN KEY ("garment_id") REFERENCES "public"."garments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_garment_id_garments_id_fk" FOREIGN KEY ("garment_id") REFERENCES "public"."garments"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_stocking_place_id_stocking_places_id_fk" FOREIGN KEY ("stocking_place_id") REFERENCES "public"."stocking_places"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "listing_status_history" ADD CONSTRAINT "listing_status_history_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "listing_status_history" ADD CONSTRAINT "listing_status_history_status_listing_statuses_id_fk" FOREIGN KEY ("status") REFERENCES "public"."listing_statuses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "expense_objects" ADD CONSTRAINT "expense_objects_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_object_id_expense_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."expense_objects"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "listing_labels" ADD CONSTRAINT "listing_labels_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "images_one_cover_per_garment" ON "images" USING btree ("garment_id") WHERE "images"."is_cover" = true;
--> statement-breakpoint
CREATE UNIQUE INDEX "listing_labels_code_available_unique" ON "listing_labels" USING btree ("code") WHERE "listing_labels"."is_used" = false;
