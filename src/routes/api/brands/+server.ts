import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { asc, ilike } from 'drizzle-orm';

export async function GET({ url }: RequestEvent) {
	const { db } = await import('$lib/server/db');
	const { brands } = await import('$lib/server/db/schema');

	const search = url.searchParams.get('search') ?? '';
	const offset = Number(url.searchParams.get('offset') ?? 0);
	const limit = Number(url.searchParams.get('limit') ?? 5);

	const results = await db
		.select({
			uuid: brands.id,
			value: brands.name
		})
		.from(brands)
		.where(ilike(brands.name, `${search}%`))
		.orderBy(asc(brands.name))
		.offset(offset)
		.limit(limit);

	return json(results);
}
