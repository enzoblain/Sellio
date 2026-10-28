import { and, eq } from 'drizzle-orm';
import {
	brands,
	models,
	sizes,
	colors,
	listings,
	listingStatuses,
	listingStatusHistory
} from '$lib/server/db/schema';
import type { Tx } from './collect';

export type AutocompleteItem = { uuid: string | null; value: string };
export type NewListing = {
	brand: AutocompleteItem;
	model: AutocompleteItem;
	size: AutocompleteItem;
	color: AutocompleteItem;
	purchasePrice: number;
	shippingPrice: number;
};

// Crée un article en statut 0 (« À récupérer »), daté de `createdAt` si fourni.
export async function insertListing(
	tx: Tx,
	{ brand, model, size, color, purchasePrice, shippingPrice }: NewListing,
	createdAt?: Date
) {
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
	const [listing] = await tx
		.insert(listings)
		.values({
			model_id: modelId,
			size_id: sizeId,
			color_id: colorId,
			purchase_price: Math.round(purchasePrice * 100),
			shipping_price: Math.round(shippingPrice * 100)
		})
		.returning({
			id: listings.id
		});

	await tx.insert(listingStatuses).values({ id: 0, name: 'purchased' }).onConflictDoNothing();
	await tx
		.insert(listingStatusHistory)
		.values({ listing_id: listing.id, status: 0, ...(createdAt && { created_at: createdAt }) });
	return listing;
}
