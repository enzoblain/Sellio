import { removeUnusedPhotos } from '$lib/server/photos';
import { command, query } from '$app/server';
import * as v from 'valibot';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { listings } from '$lib/server/db/schema';
import { editableListing, EditListingSchema, updateListing } from '$lib/server/listing-editor';
import {
	getToCollectListings,
	getStockListings,
	getToShipListings,
	getShippedListings
} from './listings.remote';
import { getDashboard } from './dashboard.remote';

const idSchema = v.pipe(v.string(), v.uuid());
export const getEditableListing = query(idSchema, async (id) => {
	const { row, status, version, label, photos } = await editableListing(getDb(), id);
	return {
		listingId: id,
		version,
		brand: { uuid: row.brand.id, value: row.brand.name },
		model: { uuid: row.model.id, value: row.model.name },
		size: { uuid: row.size.id, value: row.size.name },
		color: { uuid: row.color.id, value: row.color.name },
		purchasePrice: row.listing.purchase_price / 100,
		shippingPrice: row.listing.shipping_price / 100,
		listingPrice: row.listing.listing_price === null ? null : row.listing.listing_price / 100,
		salePrice: row.listing.sale_price === null ? null : row.listing.sale_price / 100,
		stockingPlace: row.place ? { uuid: row.place.id, value: row.place.name } : null,
		status,
		reference: label?.code ?? null,
		photos: photos.map((photo) => ({ id: photo.id, path: photo.path, isCover: photo.is_cover }))
	};
});
async function refreshAll() {
	await Promise.all([
		getToCollectListings().refresh(),
		getStockListings().refresh(),
		getToShipListings().refresh(),
		getShippedListings().refresh(),
		getDashboard().refresh()
	]);
}
export const editListing = command(EditListingSchema, async (input) => {
	const result = await updateListing(input);
	if (result.ok) {
		await getEditableListing(input.listingId).refresh();
		await refreshAll();
	}
	return result;
});
export const deleteListing = command(
	v.object({ listingId: idSchema, version: v.string() }),
	async ({ listingId, version }) => {
		const result = await getDb().transaction(async (tx) => {
			await tx.select().from(listings).where(eq(listings.id, listingId)).for('update');
			const current = await editableListing(tx, listingId);
			if (current.version !== version)
				return {
					ok: false as const,
					error: 'L’article a changé. Ferme puis rouvre la confirmation avant de supprimer.'
				};
			await tx.delete(listings).where(eq(listings.id, listingId));
			return { ok: true as const, paths: current.photos.map((photo) => photo.path) };
		});
		if (result.ok) {
			await removeUnusedPhotos(result.paths).catch(() => {});
			await refreshAll();
		}
		return result;
	}
);
