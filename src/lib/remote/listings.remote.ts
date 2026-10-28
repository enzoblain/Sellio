import { getDashboard } from './dashboard.remote';
import { command, query } from '$app/server';
import * as v from 'valibot';
import { and, eq, desc, sql } from 'drizzle-orm';

import { getDb } from '$lib/server/db';
import { collectListing, resolveStockingPlace } from '$lib/server/collect';
import { insertListing } from '$lib/server/listing-create';
import {
	brands,
	models,
	sizes,
	colors,
	listings,
	listingStatusHistory,
	stocking_places,
	images
} from '$lib/server/db/schema';

const AutocompleteItemSchema = v.object({
	uuid: v.nullable(v.string()),
	value: v.pipe(v.string(), v.trim(), v.minLength(1))
});

const CreateListingSchema = v.object({
	brand: AutocompleteItemSchema,
	model: AutocompleteItemSchema,
	size: AutocompleteItemSchema,
	color: AutocompleteItemSchema,
	purchasePrice: v.pipe(v.number(), v.finite(), v.minValue(0)),
	shippingPrice: v.pipe(v.number(), v.finite(), v.minValue(0))
});

export const createListing = command(
	CreateListingSchema,
	async ({ brand, model, size, color, purchasePrice, shippingPrice }) => {
		const db = getDb();

		const result = await db.transaction((tx) =>
			insertListing(tx, { brand, model, size, color, purchasePrice, shippingPrice })
		);
		await getToCollectListings().refresh();
		await getDashboard().refresh();
		return result;
	}
);

export const getToCollectListings = query(async () => {
	const db = getDb();
	const latestStatus = db
		.selectDistinctOn([listingStatusHistory.listing_id], {
			listingId: listingStatusHistory.listing_id,
			status: listingStatusHistory.status
		})
		.from(listingStatusHistory)
		.orderBy(
			listingStatusHistory.listing_id,
			desc(listingStatusHistory.created_at),
			desc(listingStatusHistory.id)
		)
		.as('latest_status');
	return db
		.select({
			id: listings.id,
			modelId: listings.model_id,
			sizeId: listings.size_id,
			colorId: listings.color_id,
			brand: brands.name,
			model: models.name,
			size: sizes.name,
			color: colors.name,
			purchasePrice: listings.purchase_price,
			shippingPrice: listings.shipping_price,
			image: images.path
		})
		.from(listings)
		.innerJoin(models, eq(listings.model_id, models.id))
		.innerJoin(brands, eq(models.brand_id, brands.id))
		.innerJoin(sizes, eq(listings.size_id, sizes.id))
		.innerJoin(colors, eq(listings.color_id, colors.id))
		.leftJoin(latestStatus, eq(latestStatus.listingId, listings.id))
		.leftJoin(images, and(eq(images.listing_id, listings.id), eq(images.is_cover, true)))
		.where(sql`(${latestStatus.status} = 0 or ${latestStatus.status} is null)`)
		.orderBy(desc(listings.id));
});

export const collectItem = command(
	v.object({
		listingId: v.pipe(v.string(), v.uuid()),
		stockingPlace: AutocompleteItemSchema
	}),
	async ({ listingId, stockingPlace }) => {
		const db = getDb();
		await db.transaction(async (tx) => {
			const [listing] = await tx
				.select({ id: listings.id })
				.from(listings)
				.where(eq(listings.id, listingId))
				.for('update');
			if (!listing) throw new Error('Article introuvable.');
			const placeId = await resolveStockingPlace(tx, stockingPlace);
			if ((await collectListing(tx, listingId, placeId)) === 'already')
				throw new Error('Cet article a déjà été récupéré.');
		});
		await getToCollectListings().refresh();
		await getDashboard().refresh();
		await getStockListings().refresh();
	}
);

export const getStockListings = query(async () => {
	const db = getDb();
	const latestStatus = db
		.selectDistinctOn([listingStatusHistory.listing_id], {
			listingId: listingStatusHistory.listing_id,
			status: listingStatusHistory.status
		})
		.from(listingStatusHistory)
		.orderBy(
			listingStatusHistory.listing_id,
			desc(listingStatusHistory.created_at),
			desc(listingStatusHistory.id)
		)
		.as('latest_status');
	return db
		.select({
			id: listings.id,
			modelId: listings.model_id,
			sizeId: listings.size_id,
			colorId: listings.color_id,
			brand: brands.name,
			model: models.name,
			size: sizes.name,
			color: colors.name,
			purchasePrice: listings.purchase_price,
			shippingPrice: listings.shipping_price,
			listingPrice: listings.listing_price,
			stockingPlace: stocking_places.name,
			image: images.path
		})
		.from(listings)
		.innerJoin(models, eq(listings.model_id, models.id))
		.innerJoin(brands, eq(models.brand_id, brands.id))
		.innerJoin(sizes, eq(listings.size_id, sizes.id))
		.innerJoin(colors, eq(listings.color_id, colors.id))
		.leftJoin(stocking_places, eq(listings.stocking_place_id, stocking_places.id))
		.leftJoin(latestStatus, eq(latestStatus.listingId, listings.id))
		.leftJoin(images, and(eq(images.listing_id, listings.id), eq(images.is_cover, true)))
		.where(eq(latestStatus.status, 6))
		.orderBy(desc(listings.id));
});

export const getListedListings = query(async () => {
	const db = getDb();
	const latestStatus = db
		.selectDistinctOn([listingStatusHistory.listing_id], {
			listingId: listingStatusHistory.listing_id,
			status: listingStatusHistory.status
		})
		.from(listingStatusHistory)
		.orderBy(
			listingStatusHistory.listing_id,
			desc(listingStatusHistory.created_at),
			desc(listingStatusHistory.id)
		)
		.as('latest_status');
	return db
		.select({
			id: listings.id,
			modelId: listings.model_id,
			sizeId: listings.size_id,
			colorId: listings.color_id,
			brand: brands.name,
			model: models.name,
			size: sizes.name,
			color: colors.name,
			purchasePrice: listings.purchase_price,
			shippingPrice: listings.shipping_price,
			listingPrice: listings.listing_price,
			stockingPlace: stocking_places.name,
			image: images.path
		})
		.from(listings)
		.innerJoin(models, eq(listings.model_id, models.id))
		.innerJoin(brands, eq(models.brand_id, brands.id))
		.innerJoin(sizes, eq(listings.size_id, sizes.id))
		.innerJoin(colors, eq(listings.color_id, colors.id))
		.leftJoin(stocking_places, eq(listings.stocking_place_id, stocking_places.id))
		.leftJoin(latestStatus, eq(latestStatus.listingId, listings.id))
		.leftJoin(images, and(eq(images.listing_id, listings.id), eq(images.is_cover, true)))
		.where(eq(latestStatus.status, 1))
		.orderBy(desc(listings.id));
});

export const getToShipListings = query(async () => {
	const db = getDb();
	const latestStatus = db
		.selectDistinctOn([listingStatusHistory.listing_id], {
			listingId: listingStatusHistory.listing_id,
			status: listingStatusHistory.status
		})
		.from(listingStatusHistory)
		.orderBy(
			listingStatusHistory.listing_id,
			desc(listingStatusHistory.created_at),
			desc(listingStatusHistory.id)
		)
		.as('latest_status');
	return db
		.select({
			id: listings.id,
			modelId: listings.model_id,
			sizeId: listings.size_id,
			colorId: listings.color_id,
			brand: brands.name,
			model: models.name,
			size: sizes.name,
			color: colors.name,
			purchasePrice: listings.purchase_price,
			shippingPrice: listings.shipping_price,
			salePrice: listings.sale_price,
			reference: sql<
				string | null
			>`(select code from listing_labels where listing_id = ${listings.id} order by is_used asc, id desc limit 1)`,
			stockingPlace: stocking_places.name,
			image: images.path
		})
		.from(listings)
		.innerJoin(models, eq(listings.model_id, models.id))
		.innerJoin(brands, eq(models.brand_id, brands.id))
		.innerJoin(sizes, eq(listings.size_id, sizes.id))
		.innerJoin(colors, eq(listings.color_id, colors.id))
		.leftJoin(stocking_places, eq(listings.stocking_place_id, stocking_places.id))
		.leftJoin(latestStatus, eq(latestStatus.listingId, listings.id))
		.leftJoin(images, and(eq(images.listing_id, listings.id), eq(images.is_cover, true)))
		.where(eq(latestStatus.status, 2))
		.orderBy(desc(listings.id));
});

export const getShippedListings = query(async () => {
	const db = getDb();
	const latestStatus = db
		.selectDistinctOn([listingStatusHistory.listing_id], {
			listingId: listingStatusHistory.listing_id,
			status: listingStatusHistory.status
		})
		.from(listingStatusHistory)
		.orderBy(
			listingStatusHistory.listing_id,
			desc(listingStatusHistory.created_at),
			desc(listingStatusHistory.id)
		)
		.as('latest_status');
	return db
		.select({
			id: listings.id,
			modelId: listings.model_id,
			sizeId: listings.size_id,
			colorId: listings.color_id,
			brand: brands.name,
			model: models.name,
			size: sizes.name,
			color: colors.name,
			purchasePrice: listings.purchase_price,
			shippingPrice: listings.shipping_price,
			salePrice: listings.sale_price,
			stockingPlace: stocking_places.name,
			image: images.path
		})
		.from(listings)
		.innerJoin(models, eq(listings.model_id, models.id))
		.innerJoin(brands, eq(models.brand_id, brands.id))
		.innerJoin(sizes, eq(listings.size_id, sizes.id))
		.innerJoin(colors, eq(listings.color_id, colors.id))
		.leftJoin(stocking_places, eq(listings.stocking_place_id, stocking_places.id))
		.leftJoin(latestStatus, eq(latestStatus.listingId, listings.id))
		.leftJoin(images, and(eq(images.listing_id, listings.id), eq(images.is_cover, true)))
		.where(eq(latestStatus.status, 3))
		.orderBy(desc(listings.id));
});

export const listStockItem = command(
	v.object({
		listingId: v.pipe(v.string(), v.uuid()),
		listingPrice: v.pipe(
			v.number(),
			v.finite(),
			v.minValue(0.01),
			v.maxValue(Number.MAX_SAFE_INTEGER / 100)
		)
	}),
	async ({ listingId, listingPrice }) => {
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
			if (current?.status !== 6) throw new Error('Cet article n’est plus en stock.');
			if (!listing.stocking_place_id) throw new Error('Un lieu de stockage est obligatoire.');
			await tx
				.update(listings)
				.set({ listing_price: Math.round(listingPrice * 100) })
				.where(eq(listings.id, listingId));
			await tx.insert(listingStatusHistory).values({
				listing_id: listingId,
				status: 1,
				created_at: new Date(Math.max(Date.now(), current.created_at.getTime() + 1))
			});
		});
		await Promise.all([
			getStockListings().refresh(),
			getListedListings().refresh(),
			getDashboard().refresh()
		]);
	}
);
