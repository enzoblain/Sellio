import { query } from '$app/server';
import * as v from 'valibot';
import { asc, ilike } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { brands } from '$lib/server/db/schema';

const SearchBrandsSchema = v.object({
	search: v.string(),
	offset: v.number(),
	limit: v.number()
});

export const searchBrands = query(SearchBrandsSchema, async ({ search, offset, limit }) => {
	const db = getDb();

	return db
		.select({
			uuid: brands.id,
			value: brands.name
		})
		.from(brands)
		.where(ilike(brands.name, `${search}%`))
		.orderBy(asc(brands.name))
		.offset(offset)
		.limit(limit);
});
