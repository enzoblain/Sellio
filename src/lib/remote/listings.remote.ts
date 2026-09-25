import { command } from '$app/server';
import * as v from 'valibot';
import { and, eq } from 'drizzle-orm';

import { getDb } from '$lib/server/db';
import { brands, models, sizes, colors, garments, listings } from '$lib/server/db/schema';

const AutocompleteItemSchema = v.object({
	uuid: v.nullable(v.string()),
	value: v.string()
});

const CreateListingSchema = v.object({
	brand: AutocompleteItemSchema,
	model: AutocompleteItemSchema,
	size: AutocompleteItemSchema,
	color: AutocompleteItemSchema,
	purchasePrice: v.number(),
	shippingPrice: v.number()
});

export const createListing = command(
	CreateListingSchema,
	async ({ brand, model, size, color, purchasePrice, shippingPrice }) => {
		const db = getDb();

		return db.transaction(async (tx) => {
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

			return listing;
		});
	}
);
