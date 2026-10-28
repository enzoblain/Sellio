import { json } from '@sveltejs/kit';
import * as v from 'valibot';
import { createParcel, CreateParcelSchema } from '$lib/server/parcels';
import { discardPhotos, PhotoError, preparePhotos, type PreparedPhoto } from '$lib/server/photos';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
	if (request.headers.get('origin') !== url.origin)
		return json({ ok: false, error: 'Requête non autorisée.' }, { status: 403 });
	let prepared: PreparedPhoto[] = [];
	try {
		const form = await request.formData();
		const text = (name: string) => {
			const value = form.get(name);
			return typeof value === 'string' && value.trim() ? value : null;
		};
		const input = v.parse(CreateParcelSchema, {
			carrierId: Number(text('carrierId')),
			pickupPoint: text('pickupPoint'),
			pickupDeadline: text('pickupDeadline'),
			trackingCode: text('trackingCode')
		});
		const files = form.getAll('photos');
		if (files.some((file) => typeof file === 'string')) throw new PhotoError('Photos invalides.');
		prepared = await preparePhotos(files as File[]);
		const parcel = await createParcel(input, prepared);
		return json({ ok: true, id: parcel.id });
	} catch (error) {
		await discardPhotos(prepared);
		return json(
			{
				ok: false,
				error: error instanceof PhotoError ? error.message : 'Impossible de créer le colis.'
			},
			{ status: 400 }
		);
	}
};
