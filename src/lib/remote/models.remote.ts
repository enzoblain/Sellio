import { query } from '$app/server';
import * as v from 'valibot';
import { and, asc, eq, ilike } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { models } from '$lib/server/db/schema';

const SearchModelsSchema = v.object({
	search: v.string(),
	brandId: v.optional(v.string()),
	offset: v.number(),
	limit: v.number()
});

export const searchModels = query(
	SearchModelsSchema,
	async ({ search, brandId, offset, limit }) => {
		const db = getDb();

		return db
			.select({
				uuid: models.id,
				value: models.name
			})
			.from(models)
			.where(
				and(ilike(models.name, `${search}%`), brandId ? eq(models.brand_id, brandId) : undefined)
			)
			.orderBy(asc(models.name))
			.offset(offset)
			.limit(limit);
	}
);
