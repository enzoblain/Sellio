import { query } from '$app/server';
import * as v from 'valibot';
import { asc, ilike } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { stocking_places } from '$lib/server/db/schema';

export const searchStockingPlaces = query(
	v.object({
		search: v.string(),
		offset: v.pipe(v.number(), v.integer(), v.minValue(0)),
		limit: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50))
	}),
	async ({ search, offset, limit }) =>
		getDb()
			.select({ uuid: stocking_places.id, value: stocking_places.name })
			.from(stocking_places)
			.where(ilike(stocking_places.name, `${search}%`))
			.orderBy(asc(stocking_places.name))
			.offset(offset)
			.limit(limit)
);
