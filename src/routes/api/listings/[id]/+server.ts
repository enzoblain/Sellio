import { json } from '@sveltejs/kit';
import * as v from 'valibot';
import { EditListingSchema, updateListing } from '$lib/server/listing-editor';
import {
	applyPhotos,
	preparePhotos,
	discardPhotos,
	removeUnusedPhotos,
	PhotoError,
	type ImageManifest
} from '$lib/server/photos';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ request, params, url }) => {
	if (request.headers.get('origin') !== url.origin)
		return json({ ok: false, error: 'Requête non autorisée.' }, { status: 403 });
	let prepared: Awaited<ReturnType<typeof preparePhotos>> = [];
	try {
		const form = await request.formData();
		const input = v.parse(EditListingSchema, JSON.parse(String(form.get('article'))));
		if (input.listingId !== params.id)
			return json({ ok: false, error: 'Article invalide.' }, { status: 400 });
		const manifest = JSON.parse(String(form.get('manifest'))) as ImageManifest;
		const files = form.getAll('photos');
		if (files.some((file) => typeof file === 'string')) throw new PhotoError('Photos invalides.');
		prepared = await preparePhotos(files as File[]);
		let removed: string[] = [];
		const result = await updateListing(input, async (tx, originalGarmentId, garmentId) => {
			removed = await applyPhotos(tx, originalGarmentId, garmentId, manifest, prepared);
		});
		if (!result.ok) {
			await discardPhotos(prepared);
			return json(result, { status: 409 });
		}
		await removeUnusedPhotos(removed).catch(() => {});
		return json(result);
	} catch (error) {
		await discardPhotos(prepared);
		return json(
			{
				ok: false,
				error:
					error instanceof PhotoError
						? error.message
						: 'Impossible d’enregistrer. Vérifie les champs et les photos.'
			},
			{ status: 400 }
		);
	}
};
