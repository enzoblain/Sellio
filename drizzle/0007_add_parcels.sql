CREATE TABLE "carriers" (
	"id" smallint PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "carriers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "parcels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carrier_id" smallint NOT NULL,
	"pickup_point" text,
	"pickup_deadline" date,
	"tracking_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"collected_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "images" ALTER COLUMN "listing_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN "parcel_id" uuid;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "parcel_id" uuid;--> statement-breakpoint
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_one_owner" CHECK (num_nonnulls("images"."listing_id", "images"."parcel_id") = 1);--> statement-breakpoint
INSERT INTO "carriers" ("id", "name") VALUES
	(1, 'Mondial Relay'),
	(2, 'Vinted Go'),
	(3, 'Chronopost'),
	(4, 'Colissimo')
ON CONFLICT DO NOTHING;
