import { query } from '$app/server';
import * as v from 'valibot';
import { asc, ilike } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { colors } from '$lib/server/db/schema';

const SearchColorsSchema = v.object({
	search: v.string(),
	offset: v.number(),
	limit: v.number()
});

export const searchColors = query(SearchColorsSchema, async ({ search, offset, limit }) => {
	const db = getDb();

	return db
		.select({
			uuid: colors.id,
			value: colors.name
		})
		.from(colors)
		.where(ilike(colors.name, `${search}%`))
		.orderBy(asc(colors.name))
		.offset(offset)
		.limit(limit);
});
