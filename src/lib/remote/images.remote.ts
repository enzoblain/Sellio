import { query } from '$app/server';
import * as v from 'valibot';
import { asc, desc, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { images, listings } from '$lib/server/db/schema';

export const getListingImages = query(v.pipe(v.string(), v.uuid()), async (listingId) =>
	getDb()
		.select({ id: images.id, path: images.path, isCover: images.is_cover })
		.from(images)
		.where(eq(images.listing_id, listingId))
		.orderBy(desc(images.is_cover), asc(images.position), asc(images.id))
);

export const getModelPhotos = query(v.pipe(v.string(), v.uuid()), async (modelId) => {
	const db = getDb();
	const [source] = await db
		.select({ listingId: images.listing_id })
		.from(images)
		.innerJoin(listings, eq(images.listing_id, listings.id))
		.where(eq(listings.model_id, modelId))
		.orderBy(desc(images.is_cover), asc(images.listing_id))
		.limit(1);
	if (!source) return [];
	return db
		.select({ id: images.id, path: images.path, isCover: images.is_cover })
		.from(images)
		.where(eq(images.listing_id, source.listingId))
		.orderBy(desc(images.is_cover), asc(images.position), asc(images.id))
		.limit(12);
});
