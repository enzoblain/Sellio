import { query } from '$app/server';
import * as v from 'valibot';
import { asc, desc, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { images, listings } from '$lib/server/db/schema';

export const getListingImages = query(v.pipe(v.string(), v.uuid()), async (listingId) =>
	getDb()
		.select({ id: images.id, path: images.path, isCover: images.is_cover })
		.from(images)
		.innerJoin(listings, eq(listings.garment_id, images.garment_id))
		.where(eq(listings.id, listingId))
		.orderBy(desc(images.is_cover), asc(images.position), asc(images.id))
);
