import { json } from '@sveltejs/kit';
import * as v from 'valibot';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { listings, images } from '$lib/server/db/schema';
import {
	applyPhotos,
	preparePhotos,
	discardPhotos,
	PhotoError,
	type ImageManifest
} from '$lib/server/photos';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params, url }) => {
	if (request.headers.get('origin') !== url.origin)
		return json({ ok: false, error: 'Requête non autorisée.' }, { status: 403 });
	let prepared: Awaited<ReturnType<typeof preparePhotos>> = [];
	try {
		v.parse(v.pipe(v.string(), v.uuid()), params.id);
		const form = await request.formData();
		const manifest = JSON.parse(String(form.get('manifest'))) as ImageManifest;
		const files = form.getAll('photos');
		if (files.some((file) => typeof file === 'string')) throw new PhotoError('Photos invalides.');
		prepared = await preparePhotos(files as File[]);
		await getDb().transaction(async (tx) => {
			const [listing] = await tx
				.select()
				.from(listings)
				.where(eq(listings.id, params.id))
				.for('update');
			if (!listing) throw new PhotoError('Article introuvable.');
			const [existing] = await tx
				.select()
				.from(images)
				.where(eq(images.listing_id, listing.id))
				.limit(1);
			if (existing)
				throw new PhotoError('Des photos existent déjà. Utilise le formulaire de modification.');
			await applyPhotos(tx, listing.id, manifest, prepared);
		});
		return json({ ok: true });
	} catch (error) {
		await discardPhotos(prepared);
		return json(
			{
				ok: false,
				error: error instanceof PhotoError ? error.message : 'Impossible d’ajouter les photos.'
			},
			{ status: 400 }
		);
	}
};
