import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { images } from '$lib/server/db/schema';
import { uploadsDirectory } from '$lib/server/photos';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/.test(params.file))
		error(404, 'Photo introuvable.');
	const [image] = await getDb()
		.select({ id: images.id })
		.from(images)
		.where(eq(images.path, `/images/${params.file}`))
		.limit(1);
	if (!image) error(404, 'Photo introuvable.');
	try {
		const data = await readFile(join(uploadsDirectory(), params.file));
		return new Response(data, {
			headers: {
				'Content-Type': 'image/webp',
				'Cache-Control': 'public, max-age=3600',
				'X-Content-Type-Options': 'nosniff'
			}
		});
	} catch {
		error(404, 'Photo introuvable.');
	}
};
