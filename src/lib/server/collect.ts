import { desc, eq } from 'drizzle-orm';
import type { getDb } from '$lib/server/db';
import {
	listings,
	listingStatuses,
	listingStatusHistory,
	stocking_places
} from '$lib/server/db/schema';

export type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];
export type StockingPlaceInput = { uuid: string | null; value: string };

export async function resolveStockingPlace(tx: Tx, stockingPlace: StockingPlaceInput) {
	if (stockingPlace.uuid) {
		const [place] = await tx
			.select()
			.from(stocking_places)
			.where(eq(stocking_places.id, stockingPlace.uuid));
		if (!place) throw new Error('Lieu de stockage introuvable.');
		return place.id;
	}
	await tx.insert(stocking_places).values({ name: stockingPlace.value }).onConflictDoNothing();
	const [place] = await tx
		.select()
		.from(stocking_places)
		.where(eq(stocking_places.name, stockingPlace.value));
	return place.id;
}

// Transition « À récupérer » (0) → « En stock » (6), partagée par /to-collect et les colis.
// Renvoie 'already' sans rien modifier si l'article n'est plus en statut 0.
export async function collectListing(
	tx: Tx,
	listingId: string,
	placeId: string,
	parcelId: string | null = null
) {
	const [listing] = await tx
		.select({ id: listings.id })
		.from(listings)
		.where(eq(listings.id, listingId))
		.for('update');
	if (!listing) return 'missing' as const;
	const [current] = await tx
		.select()
		.from(listingStatusHistory)
		.where(eq(listingStatusHistory.listing_id, listingId))
		.orderBy(desc(listingStatusHistory.created_at), desc(listingStatusHistory.id))
		.limit(1);
	if (current && current.status !== 0) return 'already' as const;
	await tx
		.insert(listingStatuses)
		.values([
			{ id: 0, name: 'purchased' },
			{ id: 6, name: 'stocked' }
		])
		.onConflictDoNothing();
	if (!current)
		await tx
			.insert(listingStatusHistory)
			.values({ listing_id: listingId, status: 0, created_at: new Date(Date.now() - 1) });
	await tx
		.update(listings)
		.set(
			parcelId
				? { stocking_place_id: placeId, parcel_id: parcelId }
				: { stocking_place_id: placeId }
		)
		.where(eq(listings.id, listingId));
	await tx.insert(listingStatusHistory).values({
		listing_id: listingId,
		status: 6,
		created_at: new Date(Math.max(Date.now(), (current?.created_at.getTime() ?? 0) + 1))
	});
	return 'collected' as const;
}
