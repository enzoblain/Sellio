import { getDashboard } from './dashboard.remote';
import { command, query } from '$app/server';
import * as v from 'valibot';
import { and, eq, desc, sql } from 'drizzle-orm';

import { getDb } from '$lib/server/db';
import {
	brands,
	models,
	sizes,
	colors,
	garments,
	listings,
	listingStatuses,
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

		const result = await db.transaction(async (tx) => {
			/*
			 * BRAND
			 */

			let brandId = brand.uuid;

			if (!brandId) {
				let [existingBrand] = await tx
					.select({
						id: brands.id
					})
					.from(brands)
					.where(eq(brands.name, brand.value))
					.limit(1);

				if (!existingBrand) {
					[existingBrand] = await tx
						.insert(brands)
						.values({
							name: brand.value
						})
						.onConflictDoNothing({
							target: brands.name
						})
						.returning({
							id: brands.id
						});

					if (!existingBrand) {
						[existingBrand] = await tx
							.select({
								id: brands.id
							})
							.from(brands)
							.where(eq(brands.name, brand.value))
							.limit(1);
					}
				}

				if (!existingBrand) {
					throw new Error('Impossible de créer ou récupérer la marque');
				}

				brandId = existingBrand.id;
			}

			/*
			 * MODEL
			 */

			let modelId = model.uuid;

			if (!modelId) {
				let [existingModel] = await tx
					.select({
						id: models.id
					})
					.from(models)
					.where(and(eq(models.brand_id, brandId), eq(models.name, model.value)))
					.limit(1);

				if (!existingModel) {
					[existingModel] = await tx
						.insert(models)
						.values({
							brand_id: brandId,
							name: model.value
						})
						.onConflictDoNothing({
							target: [models.brand_id, models.name]
						})
						.returning({
							id: models.id
						});

					if (!existingModel) {
						[existingModel] = await tx
							.select({
								id: models.id
							})
							.from(models)
							.where(and(eq(models.brand_id, brandId), eq(models.name, model.value)))
							.limit(1);
					}
				}

				if (!existingModel) {
					throw new Error('Impossible de créer ou récupérer le modèle');
				}

				modelId = existingModel.id;
			}

			/*
			 * SIZE
			 */

			let sizeId = size.uuid;

			if (!sizeId) {
				let [existingSize] = await tx
					.select({
						id: sizes.id
					})
					.from(sizes)
					.where(eq(sizes.name, size.value))
					.limit(1);

				if (!existingSize) {
					[existingSize] = await tx
						.insert(sizes)
						.values({
							name: size.value
						})
						.onConflictDoNothing({
							target: sizes.name
						})
						.returning({
							id: sizes.id
						});

					if (!existingSize) {
						[existingSize] = await tx
							.select({
								id: sizes.id
							})
							.from(sizes)
							.where(eq(sizes.name, size.value))
							.limit(1);
					}
				}

				if (!existingSize) {
					throw new Error('Impossible de créer ou récupérer la taille');
				}

				sizeId = existingSize.id;
			}

			/*
			 * COLOR
			 */

			let colorId = color.uuid;

			if (!colorId) {
				let [existingColor] = await tx
					.select({
						id: colors.id
					})
					.from(colors)
					.where(eq(colors.name, color.value))
					.limit(1);

				if (!existingColor) {
					[existingColor] = await tx
						.insert(colors)
						.values({
							name: color.value
						})
						.onConflictDoNothing({
							target: colors.name
						})
						.returning({
							id: colors.id
						});

					if (!existingColor) {
						[existingColor] = await tx
							.select({
								id: colors.id
							})
							.from(colors)
							.where(eq(colors.name, color.value))
							.limit(1);
					}
				}

				if (!existingColor) {
					throw new Error('Impossible de créer ou récupérer la couleur');
				}

				colorId = existingColor.id;
			}

			/*
			 * GARMENT
			 */

			const [garment] = await tx
				.insert(garments)
				.values({
					model_id: modelId,
					size_id: sizeId,
					color_id: colorId
				})
				.returning({
					id: garments.id
				});

			/*
			 * LISTING
			 */

			const [listing] = await tx
				.insert(listings)
				.values({
					garment_id: garment.id,
					purchase_price: Math.round(purchasePrice * 100),
					shipping_price: Math.round(shippingPrice * 100)
				})
				.returning({
					id: listings.id
				});

			await tx.insert(listingStatuses).values({ id: 0, name: 'purchased' }).onConflictDoNothing();
			await tx.insert(listingStatusHistory).values({ listing_id: listing.id, status: 0 });
			return listing;
		});
		await getToCollectListings().refresh();
		await getDashboard().refresh();
		return result;
	}
);

// The latest history entry is the current status; older purchased entries must not
// bring an already listed item back into the collection queue.
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
			brand: brands.name,
			model: models.name,
			size: sizes.name,
			color: colors.name,
			purchasePrice: listings.purchase_price,
			shippingPrice: listings.shipping_price,
			image: images.path
		})
		.from(listings)
		.innerJoin(garments, eq(listings.garment_id, garments.id))
		.innerJoin(models, eq(garments.model_id, models.id))
		.innerJoin(brands, eq(models.brand_id, brands.id))
		.innerJoin(sizes, eq(garments.size_id, sizes.id))
		.innerJoin(colors, eq(garments.color_id, colors.id))
		.leftJoin(latestStatus, eq(latestStatus.listingId, listings.id))
		.leftJoin(images, and(eq(images.garment_id, garments.id), eq(images.is_cover, true)))
		.where(sql`(${latestStatus.status} = 0 or ${latestStatus.status} is null)`)
		.orderBy(desc(listings.id));
});

export const listCollectedItem = command(
	v.object({
		listingId: v.pipe(v.string(), v.uuid()),
		listingPrice: v.pipe(v.number(), v.finite(), v.minValue(0.01)),
		stockingPlace: AutocompleteItemSchema
	}),
	async ({ listingId, listingPrice, stockingPlace }) => {
		const db = getDb();
		await db.transaction(async (tx) => {
			// Serialize transitions for the same listing to avoid duplicate history.
			const [listing] = await tx
				.select({ id: listings.id })
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
			if (current && current.status !== 0) throw new Error('Cet article a déjà été récupéré.');
			let placeId = stockingPlace.uuid;
			if (placeId) {
				const [place] = await tx
					.select()
					.from(stocking_places)
					.where(eq(stocking_places.id, placeId));
				if (!place) throw new Error('Lieu de stockage introuvable.');
			} else {
				await tx
					.insert(stocking_places)
					.values({ name: stockingPlace.value })
					.onConflictDoNothing();
				const [place] = await tx
					.select()
					.from(stocking_places)
					.where(eq(stocking_places.name, stockingPlace.value));
				placeId = place.id;
			}
			await tx
				.insert(listingStatuses)
				.values([
					{ id: 0, name: 'purchased' },
					{ id: 1, name: 'listed' }
				])
				.onConflictDoNothing();
			if (!current)
				await tx
					.insert(listingStatusHistory)
					.values({ listing_id: listingId, status: 0, created_at: new Date(Date.now() - 1) });
			await tx
				.update(listings)
				.set({ listing_price: Math.round(listingPrice * 100), stocking_place_id: placeId })
				.where(eq(listings.id, listingId));
			await tx
				.insert(listingStatusHistory)
				.values({ listing_id: listingId, status: 1, created_at: new Date() });
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
		.innerJoin(garments, eq(listings.garment_id, garments.id))
		.innerJoin(models, eq(garments.model_id, models.id))
		.innerJoin(brands, eq(models.brand_id, brands.id))
		.innerJoin(sizes, eq(garments.size_id, sizes.id))
		.innerJoin(colors, eq(garments.color_id, colors.id))
		.leftJoin(stocking_places, eq(listings.stocking_place_id, stocking_places.id))
		.leftJoin(latestStatus, eq(latestStatus.listingId, listings.id))
		.leftJoin(images, and(eq(images.garment_id, garments.id), eq(images.is_cover, true)))
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
		.innerJoin(garments, eq(listings.garment_id, garments.id))
		.innerJoin(models, eq(garments.model_id, models.id))
		.innerJoin(brands, eq(models.brand_id, brands.id))
		.innerJoin(sizes, eq(garments.size_id, sizes.id))
		.innerJoin(colors, eq(garments.color_id, colors.id))
		.leftJoin(stocking_places, eq(listings.stocking_place_id, stocking_places.id))
		.leftJoin(latestStatus, eq(latestStatus.listingId, listings.id))
		.leftJoin(images, and(eq(images.garment_id, garments.id), eq(images.is_cover, true)))
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
		.innerJoin(garments, eq(listings.garment_id, garments.id))
		.innerJoin(models, eq(garments.model_id, models.id))
		.innerJoin(brands, eq(models.brand_id, brands.id))
		.innerJoin(sizes, eq(garments.size_id, sizes.id))
		.innerJoin(colors, eq(garments.color_id, colors.id))
		.leftJoin(stocking_places, eq(listings.stocking_place_id, stocking_places.id))
		.leftJoin(latestStatus, eq(latestStatus.listingId, listings.id))
		.leftJoin(images, and(eq(images.garment_id, garments.id), eq(images.is_cover, true)))
		.where(eq(latestStatus.status, 3))
		.orderBy(desc(listings.id));
});
