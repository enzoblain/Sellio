-- Preserve article attributes and photos before removing garments.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM images i WHERE NOT EXISTS (SELECT 1 FROM listings l WHERE l.garment_id = i.garment_id)) THEN
  RAISE EXCEPTION 'Images without a listing must be assigned before migration';
 END IF;
END $$;
--> statement-breakpoint
ALTER TABLE listings ADD COLUMN model_id uuid, ADD COLUMN size_id uuid, ADD COLUMN color_id uuid;
--> statement-breakpoint
UPDATE listings l SET model_id=g.model_id, size_id=g.size_id, color_id=g.color_id FROM garments g WHERE l.garment_id=g.id;
--> statement-breakpoint
ALTER TABLE listings ALTER COLUMN model_id SET NOT NULL, ALTER COLUMN size_id SET NOT NULL, ALTER COLUMN color_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE images ADD COLUMN listing_id uuid;
--> statement-breakpoint
DROP INDEX images_one_cover_per_garment;
--> statement-breakpoint
UPDATE images i SET listing_id=(SELECT l.id FROM listings l WHERE l.garment_id=i.garment_id ORDER BY l.id LIMIT 1);
--> statement-breakpoint
INSERT INTO images (id, garment_id, listing_id, path, mime_type, size_bytes, width, height, is_cover, position)
 SELECT gen_random_uuid(), i.garment_id, l.id, i.path, i.mime_type, i.size_bytes, i.width, i.height, i.is_cover, i.position
 FROM images i JOIN listings l ON l.garment_id=i.garment_id WHERE l.id<>i.listing_id;
--> statement-breakpoint
ALTER TABLE images ALTER COLUMN listing_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE images DROP CONSTRAINT images_garment_id_garments_id_fk;
--> statement-breakpoint
ALTER TABLE listings DROP CONSTRAINT listings_garment_id_garments_id_fk;
--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_size_id_sizes_id_fk" FOREIGN KEY ("size_id") REFERENCES "public"."sizes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_color_id_colors_id_fk" FOREIGN KEY ("color_id") REFERENCES "public"."colors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "images_one_cover_per_listing" ON "images" USING btree ("listing_id") WHERE "images"."is_cover" = true;--> statement-breakpoint
ALTER TABLE "images" DROP COLUMN "garment_id";--> statement-breakpoint
ALTER TABLE "listings" DROP COLUMN "garment_id";
--> statement-breakpoint
DROP TABLE garments;
