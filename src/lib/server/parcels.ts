import { asc, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import * as v from 'valibot';
import { getDb } from '$lib/server/db';
import { carriers, images, listings, parcels } from '$lib/server/db/schema';
import { collectListing, resolveStockingPlace, type Tx } from '$lib/server/collect';
import { insertListing } from '$lib/server/listing-create';
import { PhotoError, removeUnusedPhotos, type PreparedPhoto } from '$lib/server/photos';

const item = v.object({
	uuid: v.nullable(v.pipe(v.string(), v.uuid())),
	value: v.pipe(v.string(), v.trim(), v.minLength(1))
});
const optionalText = v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(200))));
const money = v.pipe(
	v.number(),
	v.finite(),
	v.minValue(0),
	v.maxValue(Number.MAX_SAFE_INTEGER / 100)
);

export const CreateParcelSchema = v.object({
	carrierId: v.pipe(v.number(), v.integer()),
	pickupPoint: optionalText,
	pickupDeadline: v.optional(v.nullable(v.pipe(v.string(), v.isoDate()))),
	trackingCode: optionalText
});
export type CreateParcel = v.InferOutput<typeof CreateParcelSchema>;

export const CollectParcelSchema = v.object({
	parcelId: v.pipe(v.string(), v.uuid()),
	stockingPlace: v.nullable(item),
	listingIds: v.pipe(v.array(v.pipe(v.string(), v.uuid())), v.maxLength(200)),
	newListings: v.optional(
		v.pipe(
			v.array(
				v.object({
					brand: item,
					model: item,
					size: item,
					color: item,
					purchasePrice: money,
					shippingPrice: money
				})
			),
			v.maxLength(200)
		),
		[]
	)
});
export type CollectParcel = v.InferOutput<typeof CollectParcelSchema>;

const blank = (value: string | null | undefined) => value?.trim() || null;

export async function listCarriers(db: Pick<ReturnType<typeof getDb>, 'select'> = getDb()) {
	return db.select().from(carriers).orderBy(asc(carriers.id));
}

// Crée le colis et ses photos de code-barres (déjà préparées par preparePhotos) en une transaction.
export async function createParcel(input: CreateParcel, prepared: PreparedPhoto[]) {
	return getDb().transaction(async (tx) => {
		const [carrier] = await tx.select().from(carriers).where(eq(carriers.id, input.carrierId));
		if (!carrier) throw new PhotoError('Transporteur inconnu.');
		const [parcel] = await tx
			.insert(parcels)
			.values({
				carrier_id: carrier.id,
				pickup_point: blank(input.pickupPoint),
				pickup_deadline: input.pickupDeadline ?? null,
				tracking_code: blank(input.trackingCode)
			})
			.returning();
		for (let position = 0; position < prepared.length; position++) {
			const photo = prepared[position];
			await tx.insert(images).values({
				id: photo.id,
				parcel_id: parcel.id,
				path: photo.path,
				mime_type: photo.mime_type,
				size_bytes: photo.size_bytes,
				width: photo.width,
				height: photo.height,
				position,
				is_cover: false
			});
		}
		return parcel;
	});
}

const parcelColumns = {
	id: parcels.id,
	carrierId: parcels.carrier_id,
	carrier: carriers.name,
	pickupPoint: parcels.pickup_point,
	pickupDeadline: parcels.pickup_deadline,
	trackingCode: parcels.tracking_code,
	createdAt: parcels.created_at,
	collectedAt: parcels.collected_at
};

async function withPhotos<T extends { id: string }>(rows: T[]) {
	const photos = rows.length
		? await getDb()
				.select({ id: images.id, parcelId: images.parcel_id, path: images.path })
				.from(images)
				.where(
					inArray(
						images.parcel_id,
						rows.map((row) => row.id)
					)
				)
				.orderBy(asc(images.position), asc(images.id))
		: [];
	return rows.map((row) => ({
		...row,
		photos: photos
			.filter((photo) => photo.parcelId === row.id)
			.map(({ id, path }) => ({ id, path }))
	}));
}

export async function listParcelsToCollect() {
	const rows = await getDb()
		.select(parcelColumns)
		.from(parcels)
		.innerJoin(carriers, eq(parcels.carrier_id, carriers.id))
		.where(isNull(parcels.collected_at))
		.orderBy(sql`${parcels.pickup_deadline} asc nulls last`, asc(parcels.created_at));
	return withPhotos(rows);
}

export async function listCollectedParcels() {
	const rows = await getDb()
		.select({
			...parcelColumns,
			listingCount: sql<number>`(select count(*)::int from listings where listings.parcel_id = ${parcels.id})`
		})
		.from(parcels)
		.innerJoin(carriers, eq(parcels.carrier_id, carriers.id))
		.where(isNotNull(parcels.collected_at))
		.orderBy(desc(parcels.collected_at));
	return withPhotos(rows);
}

// « Récupéré » : une seule transaction. Un article déjà passé hors statut 0 est sauté, pas en échec.
export async function collectParcel(input: CollectParcel) {
	return getDb().transaction(async (tx: Tx) => {
		const [parcel] = await tx
			.select()
			.from(parcels)
			.where(eq(parcels.id, input.parcelId))
			.for('update');
		if (!parcel) throw new Error('Colis introuvable.');
		if (parcel.collected_at) throw new Error('Ce colis a déjà été récupéré.');
		const listingIds = [...new Set(input.listingIds)];
		const newListings = input.newListings ?? [];
		if ((listingIds.length || newListings.length) && !input.stockingPlace)
			throw new Error('Un lieu de stockage est obligatoire.');
		await tx.update(parcels).set({ collected_at: new Date() }).where(eq(parcels.id, parcel.id));
		const result = { collected: [] as string[], skipped: [] as string[], created: [] as string[] };
		if (!input.stockingPlace) return result;
		const placeId = await resolveStockingPlace(tx, input.stockingPlace);
		for (const listingId of listingIds) {
			const outcome = await collectListing(tx, listingId, placeId, parcel.id);
			(outcome === 'collected' ? result.collected : result.skipped).push(listingId);
		}
		for (const draft of newListings) {
			// Statut 0 daté de l'arrivée du colis (la date d'achat du dashboard), puis stock.
			const created = await insertListing(tx, draft, parcel.created_at);
			await collectListing(tx, created.id, placeId, parcel.id);
			result.created.push(created.id);
		}
		return result;
	});
}

// Supprime un colis non récupéré et ses photos ; ne touche jamais aux articles.
export async function deleteParcel(parcelId: string) {
	const paths = await getDb().transaction(async (tx) => {
		const [parcel] = await tx.select().from(parcels).where(eq(parcels.id, parcelId)).for('update');
		if (!parcel) throw new Error('Colis introuvable.');
		if (parcel.collected_at) throw new Error('Un colis récupéré ne peut pas être supprimé.');
		await tx.update(listings).set({ parcel_id: null }).where(eq(listings.parcel_id, parcelId));
		const photos = await tx
			.select({ path: images.path })
			.from(images)
			.where(eq(images.parcel_id, parcelId));
		await tx.delete(parcels).where(eq(parcels.id, parcelId));
		return photos.map((photo) => photo.path);
	});
	await removeUnusedPhotos(paths).catch(() => {});
}
