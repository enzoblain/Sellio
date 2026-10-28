-- Retour arrière manuel de 0007_add_parcels (non joué par drizzle-kit).
-- À exécuter avec psql, dans cet ordre, puis redéployer la version précédente du code.
-- Attention : les photos de code-barres des colis sont supprimées de la table ;
-- les fichiers /images/<uuid>.webp correspondants restent sur le disque (sans effet).
BEGIN;
ALTER TABLE "images" DROP CONSTRAINT "images_one_owner";
DELETE FROM "images" WHERE "listing_id" IS NULL;
ALTER TABLE "images" ALTER COLUMN "listing_id" SET NOT NULL;
ALTER TABLE "images" DROP COLUMN "parcel_id";
ALTER TABLE "listings" DROP COLUMN "parcel_id";
DROP TABLE "parcels";
DROP TABLE "carriers";
-- Oublier la migration pour qu'elle puisse être rejouée plus tard.
DELETE FROM drizzle.__drizzle_migrations WHERE created_at = (SELECT MAX(created_at) FROM drizzle.__drizzle_migrations);
COMMIT;
