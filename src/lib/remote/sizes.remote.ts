import { query } from '$app/server';
import * as v from 'valibot';
import { asc, ilike } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { sizes } from '$lib/server/db/schema';

const SearchSizesSchema = v.object({
	search: v.string(),
	offset: v.number(),
	limit: v.number()
});

export const searchSizes = query(SearchSizesSchema, async ({ search, offset, limit }) => {
	const db = getDb();

	return db
		.select({
			uuid: sizes.id,
			value: sizes.name
		})
		.from(sizes)
		.where(ilike(sizes.name, `${search}%`))
		.orderBy(asc(sizes.name))
		.offset(offset)
		.limit(limit);
});
