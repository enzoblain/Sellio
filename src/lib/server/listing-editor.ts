import { createHash } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import * as v from 'valibot';
import { getDb } from '$lib/server/db';
import {
	brands,
	models,
	sizes,
	colors,
	garments,
	listings,
	stocking_places,
	listingLabels,
	listingStatuses,
	listingStatusHistory,
	images
} from '$lib/server/db/schema';

const text = v.pipe(v.string(), v.trim(), v.minLength(1));
const item = v.object({ value: text, uuid: v.nullable(v.pipe(v.string(), v.uuid())) });
const money = v.pipe(
	v.number(),
	v.finite(),
	v.minValue(0),
	v.maxValue(Number.MAX_SAFE_INTEGER / 100)
);
export const EditListingSchema = v.object({
	listingId: v.pipe(v.string(), v.uuid()),
	version: v.string(),
	brand: item,
	model: item,
	size: item,
	color: item,
	purchasePrice: money,
	shippingPrice: money,
	listingPrice: v.nullable(money),
	salePrice: v.nullable(money),
	stockingPlace: v.nullable(item),
	status: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(5))
});
export type EditListing = v.InferOutput<typeof EditListingSchema>;
export function statusError(
	input: Pick<EditListing, 'status' | 'listingPrice' | 'salePrice' | 'stockingPlace'>
) {
	if (input.status >= 1 && (!input.listingPrice || input.listingPrice < 0.01))
		return 'Un prix de mise en vente est obligatoire pour ce statut.';
	if (input.status >= 1 && !input.stockingPlace?.value.trim())
		return 'Un lieu de stockage est obligatoire pour ce statut.';
	if (input.status >= 2 && (!input.salePrice || input.salePrice < 0.01))
		return 'Un prix vendu est obligatoire pour ce statut.';
	return null;
}
export async function editableListing(db: Pick<ReturnType<typeof getDb>, 'select'>, id: string) {
	const [row] = await db
		.select({
			listing: listings,
			garment: garments,
			brand: brands,
			model: models,
			size: sizes,
			color: colors,
			place: stocking_places
		})
		.from(listings)
		.innerJoin(garments, eq(listings.garment_id, garments.id))
		.innerJoin(models, eq(garments.model_id, models.id))
		.innerJoin(brands, eq(models.brand_id, brands.id))
		.innerJoin(sizes, eq(garments.size_id, sizes.id))
		.innerJoin(colors, eq(garments.color_id, colors.id))
		.leftJoin(stocking_places, eq(listings.stocking_place_id, stocking_places.id))
		.where(eq(listings.id, id));
	if (!row) throw new Error('Article introuvable.');
	const [history] = await db
		.select()
		.from(listingStatusHistory)
		.where(eq(listingStatusHistory.listing_id, id))
		.orderBy(desc(listingStatusHistory.created_at), desc(listingStatusHistory.id))
		.limit(1);
	const [label] = await db
		.select()
		.from(listingLabels)
		.where(and(eq(listingLabels.listing_id, id), eq(listingLabels.is_used, false)))
		.limit(1);
	return {
		row,
		status: history?.status ?? 0,
		history,
		label,
		version: createHash('sha256').update(JSON.stringify({ row, history, label })).digest('hex')
	};
}

export async function updateListing(input: EditListing) {
	const error = statusError(input);
	if (error) return { ok: false as const, error };
	return getDb().transaction(async (tx) => {
		await tx
			.select({ id: listings.id })
			.from(listings)
			.where(eq(listings.id, input.listingId))
			.for('update');
		const current = await editableListing(tx, input.listingId);
		if (current.version !== input.version)
			return {
				ok: false as const,
				error: 'L’article a changé depuis l’ouverture. Ferme puis rouvre le formulaire.'
			};
		async function resolveSimple(
			table: typeof brands | typeof sizes | typeof colors | typeof stocking_places,
			value: { value: string; uuid: string | null }
		) {
			if (value.uuid) {
				const [existing] = await tx
					.select({ id: table.id })
					.from(table)
					.where(eq(table.id, value.uuid));
				if (!existing) throw new Error('Une option sélectionnée n’existe plus.');
				return existing.id;
			}
			await tx.insert(table).values({ name: value.value }).onConflictDoNothing();
			const [existing] = await tx
				.select({ id: table.id })
				.from(table)
				.where(eq(table.name, value.value));
			return existing.id;
		}
		const brandId = await resolveSimple(brands, input.brand);
		let modelId = input.model.uuid;
		if (modelId) {
			const [model] = await tx
				.select()
				.from(models)
				.where(and(eq(models.id, modelId), eq(models.brand_id, brandId)));
			if (!model) throw new Error('Le modèle sélectionné ne correspond pas à cette marque.');
		} else {
			await tx
				.insert(models)
				.values({ brand_id: brandId, name: input.model.value })
				.onConflictDoNothing();
			const [model] = await tx
				.select()
				.from(models)
				.where(and(eq(models.brand_id, brandId), eq(models.name, input.model.value)));
			modelId = model.id;
		}
		const garmentValues = {
			model_id: modelId,
			size_id: await resolveSimple(sizes, input.size),
			color_id: await resolveSimple(colors, input.color)
		};
		// A garment may be shared: editing a listing must not modify other articles.
		const siblings = await tx
			.select({ id: listings.id })
			.from(listings)
			.where(eq(listings.garment_id, current.row.garment.id));
		let garmentId = current.row.garment.id;
		if (siblings.length > 1) {
			const [garment] = await tx.insert(garments).values(garmentValues).returning();
			garmentId = garment.id;
			const photos = await tx
				.select()
				.from(images)
				.where(eq(images.garment_id, current.row.garment.id));
			for (const photo of photos) {
				const values = {
					path: photo.path,
					mime_type: photo.mime_type,
					size_bytes: photo.size_bytes,
					width: photo.width,
					height: photo.height,
					is_cover: photo.is_cover
				};
				await tx.insert(images).values({ ...values, garment_id: garmentId });
			}
		} else await tx.update(garments).set(garmentValues).where(eq(garments.id, garmentId));
		const placeId = input.stockingPlace
			? await resolveSimple(stocking_places, input.stockingPlace)
			: null;
		await tx
			.update(listings)
			.set({
				garment_id: garmentId,
				purchase_price: Math.round(input.purchasePrice * 100),
				shipping_price: Math.round(input.shippingPrice * 100),
				listing_price: input.listingPrice === null ? null : Math.round(input.listingPrice * 100),
				sale_price: input.salePrice === null ? null : Math.round(input.salePrice * 100),
				stocking_place_id: placeId
			})
			.where(eq(listings.id, input.listingId));
		await tx
			.insert(listingStatuses)
			.values([
				{ id: 0, name: 'purchased' },
				{ id: 1, name: 'listed' },
				{ id: 2, name: 'to_ship' },
				{ id: 3, name: 'shipped' },
				{ id: 4, name: 'completed' },
				{ id: 5, name: 'returned' }
			])
			.onConflictDoNothing();
		const changedAt = Math.max(Date.now(), (current.history?.created_at.getTime() ?? 0) + 3);
		if (!current.history)
			await tx
				.insert(listingStatusHistory)
				.values({ listing_id: input.listingId, status: 0, created_at: new Date(changedAt - 2) });
		if (input.status >= 2 && input.status <= 4 && current.status < 2 && input.status !== 2) {
			await tx
				.insert(listingStatusHistory)
				.values({ listing_id: input.listingId, status: 2, created_at: new Date(changedAt - 1) });
		}
		if (input.status !== current.status)
			await tx
				.insert(listingStatusHistory)
				.values({
					listing_id: input.listingId,
					status: input.status,
					created_at: new Date(changedAt)
				});

		let code = current.label?.code ?? null;
		if (input.status >= 2 && input.status <= 4 && !code) {
			for (let attempt = 0; !code && attempt < 32; attempt++) {
				const [label] = await tx
					.insert(listingLabels)
					.values({ listing_id: input.listingId })
					.onConflictDoNothing()
					.returning();
				code = label?.code ?? null;
			}
			if (!code) throw new Error('Impossible de générer une référence disponible.');
		}
		return { ok: true as const, code };
	});
}
