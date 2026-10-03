import { getDashboard } from './dashboard.remote';
import { command } from '$app/server';
import * as v from 'valibot';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import {
	listings,
	listingLabels,
	listingStatusHistory,
	listingStatuses
} from '$lib/server/db/schema';
import { getStockListings, getToShipListings, getShippedListings } from './listings.remote';

export const sellListing = command(
	v.object({
		listingId: v.pipe(v.string(), v.uuid()),
		salePrice: v.pipe(v.number(), v.finite(), v.minValue(0.01))
	}),
	async ({ listingId, salePrice }) => {
		const code = await getDb().transaction(async (tx) => {
			const [listing] = await tx
				.select()
				.from(listings)
				.where(eq(listings.id, listingId))
				.for('update');
			if (!listing) throw new Error('Article introuvable.');
			const [current] = await tx
				.select()
				.from(listingStatusHistory)
				.where(eq(listingStatusHistory.listing_id, listingId))
				.orderBy(desc(listingStatusHistory.created_at), desc(listingStatusHistory.id))
				.limit(1);
			if (current?.status !== 1) throw new Error('Cet article n’est plus en vente.');
			if (!listing.listing_price || !listing.stocking_place_id)
				throw new Error('Renseigne le prix de mise en vente et le stockage avant de vendre.');
			let [label] = await tx
				.select({ code: listingLabels.code })
				.from(listingLabels)
				.where(and(eq(listingLabels.listing_id, listingId), eq(listingLabels.is_used, false)))
				.limit(1);
			// A collision on an available code does not abort the sale transaction.
			for (let attempt = 0; !label && attempt < 32; attempt++) {
				[label] = await tx
					.insert(listingLabels)
					.values({ listing_id: listingId })
					.onConflictDoNothing()
					.returning({ code: listingLabels.code });
			}
			if (!label) throw new Error('Impossible de générer un code disponible. Réessaie.');
			await tx.insert(listingStatuses).values({ id: 2, name: 'to_ship' }).onConflictDoNothing();
			await tx
				.update(listings)
				.set({ sale_price: Math.round(salePrice * 100) })
				.where(eq(listings.id, listingId));
			await tx.insert(listingStatusHistory).values({ listing_id: listingId, status: 2 });
			return label.code;
		});
		await getStockListings().refresh();
		await getToShipListings().refresh();
		await getDashboard().refresh();
		return { code };
	}
);

export const shipListing = command(
	v.object({
		listingId: v.pipe(v.string(), v.uuid())
	}),
	async ({ listingId }) => {
		await getDb().transaction(async (tx) => {
			const [listing] = await tx
				.select()
				.from(listings)
				.where(eq(listings.id, listingId))
				.for('update');
			if (!listing) throw new Error('Article introuvable.');
			const [current] = await tx
				.select()
				.from(listingStatusHistory)
				.where(eq(listingStatusHistory.listing_id, listingId))
				.orderBy(desc(listingStatusHistory.created_at), desc(listingStatusHistory.id))
				.limit(1);
			if (current?.status !== 2) throw new Error('Cet article n’est plus à expédier.');
			if (!listing.sale_price || !listing.listing_price || !listing.stocking_place_id)
				throw new Error(
					'Renseigne le prix vendu, le prix de mise en vente et le stockage avant d’expédier.'
				);
			await tx.insert(listingStatuses).values({ id: 3, name: 'shipped' }).onConflictDoNothing();
			await tx.insert(listingStatusHistory).values({ listing_id: listingId, status: 3 });
		});
		await getToShipListings().refresh();
		await getDashboard().refresh();
		await getShippedListings().refresh();
	}
);
