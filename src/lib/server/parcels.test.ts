// @vitest-environment node
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as schema from '$lib/server/db/schema';

const state = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('$lib/server/db', () => ({ getDb: () => state.db }));

import { calculateMetrics } from '$lib/dashboard/metrics';
import { collectListing, resolveStockingPlace, type Tx } from '$lib/server/collect';
import { insertListing } from '$lib/server/listing-create';
import { preparePhotos } from '$lib/server/photos';
import {
	collectParcel,
	createParcel,
	deleteParcel,
	listCarriers,
	listCollectedParcels,
	listParcelsToCollect
} from '$lib/server/parcels';

const { carriers, images, listings, listingStatusHistory, parcels } = schema;
const client = new PGlite();
const db = drizzle(client);
state.db = db;
let uploads: string;

const item = (value: string) => ({ uuid: null, value });
const draft = (model = 'Jean 501') => ({
	brand: item('Levi’s'),
	model: item(model),
	size: item('M'),
	color: item('Bleu'),
	purchasePrice: 10,
	shippingPrice: 2
});
const statusOf = async (id: string) => {
	const rows = await db
		.select()
		.from(listingStatusHistory)
		.where(eq(listingStatusHistory.listing_id, id));
	return rows.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
};
const newArticle = async () => {
	const { id } = await db.transaction((tx) => insertListing(tx as unknown as Tx, draft()));
	return id;
};
const barcode = async () => {
	const buffer = await sharp({
		create: { width: 40, height: 20, channels: 3, background: '#fff' }
	})
		.png()
		.toBuffer();
	return new File([new Uint8Array(buffer)], 'code.png', { type: 'image/png' });
};

beforeAll(async () => {
	uploads = await mkdtemp(join(tmpdir(), 'parcels-'));
	process.env.UPLOADS_DIR = uploads;
	await migrate(db, { migrationsFolder: 'drizzle' });
	await db
		.insert(schema.listingStatuses)
		.values([
			{ id: 0, name: 'purchased' },
			{ id: 6, name: 'stocked' }
		])
		.onConflictDoNothing();
});
afterAll(async () => {
	await client.close();
	await rm(uploads, { recursive: true, force: true });
});
beforeEach(async () => {
	await db.execute(sql`truncate parcels, listings, images cascade`);
	for (const file of await readdir(uploads)) await rm(join(uploads, file));
});

describe('migration 0007', () => {
	it('crée les 4 transporteurs, ajouter un transporteur est un simple INSERT', async () => {
		expect((await listCarriers(db)).map((c) => [c.id, c.name])).toEqual([
			[1, 'Mondial Relay'],
			[2, 'Vinted Go'],
			[3, 'Chronopost'],
			[4, 'Colissimo']
		]);
		await db.insert(carriers).values({ id: 5, name: 'DPD' });
		expect(await listCarriers(db)).toHaveLength(5);
		await db.delete(carriers).where(eq(carriers.id, 5));
	});

	it('garde le CHECK images : exactement un propriétaire', async () => {
		const [parcel] = await db.insert(parcels).values({ carrier_id: 1 }).returning();
		const id = await newArticle();
		const base = { path: '/images/x.webp', mime_type: 'image/webp', size_bytes: 1 };
		await expect(db.insert(images).values(base)).rejects.toThrow();
		await expect(
			db.insert(images).values({ ...base, listing_id: id, parcel_id: parcel.id })
		).rejects.toThrow();
		await db.insert(images).values({ ...base, listing_id: id });
		await db.insert(images).values({ ...base, parcel_id: parcel.id });
	});
});

describe('création d’un colis', () => {
	it('stocke les photos de code-barres via le pipeline photo', async () => {
		const prepared = await preparePhotos([await barcode(), await barcode()]);
		const parcel = await createParcel(
			{ carrierId: 2, pickupPoint: ' Tabac ', pickupDeadline: '2026-11-05', trackingCode: '' },
			prepared
		);
		expect(parcel).toMatchObject({
			carrier_id: 2,
			pickup_point: 'Tabac',
			pickup_deadline: '2026-11-05',
			tracking_code: null,
			collected_at: null
		});
		const rows = await db.select().from(images).where(eq(images.parcel_id, parcel.id));
		expect(rows.map((row) => [row.listing_id, row.position, row.is_cover])).toEqual(
			expect.arrayContaining([
				[null, 0, false],
				[null, 1, false]
			])
		);
		expect(await readdir(uploads)).toHaveLength(2);
		const [listed] = await listParcelsToCollect();
		expect(listed.carrier).toBe('Vinted Go');
		expect(listed.photos).toHaveLength(2);
	});

	it('refuse un transporteur inconnu', async () => {
		await expect(createParcel({ carrierId: 99 }, [])).rejects.toThrow('Transporteur inconnu');
	});
});

describe('« Récupéré »', () => {
	it('passe les articles cochés de 0 à 6 avec parcel_id et le lieu, saute les autres', async () => {
		const parcel = await createParcel({ carrierId: 1 }, []);
		const [a, b, stocked] = [await newArticle(), await newArticle(), await newArticle()];
		await db.transaction(async (tx) => {
			await collectListing(
				tx as unknown as Tx,
				stocked,
				await resolveStockingPlace(tx as unknown as Tx, item('Cave'))
			);
		});
		const result = await collectParcel({
			parcelId: parcel.id,
			stockingPlace: item('Garage'),
			listingIds: [a, stocked],
			newListings: []
		});
		expect(result).toMatchObject({ collected: [a], skipped: [stocked] });
		const rows = await db.select().from(listings);
		const byId = Object.fromEntries(rows.map((row) => [row.id, row]));
		expect(byId[a].parcel_id).toBe(parcel.id);
		expect(byId[a].stocking_place_id).not.toBeNull();
		expect(byId[stocked].parcel_id).toBeNull();
		expect(byId[b].parcel_id).toBeNull();
		expect((await statusOf(a)).map((row) => row.status)).toEqual([0, 6]);
		expect((await statusOf(stocked)).map((row) => row.status)).toEqual([0, 6]);
		expect((await statusOf(b)).map((row) => row.status)).toEqual([0]);
		const [after] = await db.select().from(parcels);
		expect(after.collected_at).not.toBeNull();
		expect(await listParcelsToCollect()).toHaveLength(0);
		const [collected] = await listCollectedParcels();
		expect(collected.listingCount).toBe(1);
	});

	it('accepte 0 article coché, sans lieu', async () => {
		const parcel = await createParcel({ carrierId: 3 }, []);
		const result = await collectParcel({
			parcelId: parcel.id,
			stockingPlace: null,
			listingIds: [],
			newListings: []
		});
		expect(result).toEqual({ collected: [], skipped: [], created: [] });
		expect((await db.select().from(parcels))[0].collected_at).not.toBeNull();
	});

	it('exige un lieu quand des articles sont cochés et ne change rien en cas d’échec', async () => {
		const parcel = await createParcel({ carrierId: 3 }, []);
		const id = await newArticle();
		await expect(
			collectParcel({ parcelId: parcel.id, stockingPlace: null, listingIds: [id], newListings: [] })
		).rejects.toThrow('lieu de stockage');
		expect((await db.select().from(parcels))[0].collected_at).toBeNull();
	});

	it('refuse un colis déjà récupéré', async () => {
		const parcel = await createParcel({ carrierId: 3 }, []);
		const input = { parcelId: parcel.id, stockingPlace: null, listingIds: [], newListings: [] };
		await collectParcel(input);
		await expect(collectParcel(input)).rejects.toThrow('déjà été récupéré');
	});

	it('annule tout si un nouvel article est invalide (transaction unique)', async () => {
		const parcel = await createParcel({ carrierId: 3 }, []);
		const id = await newArticle();
		await expect(
			collectParcel({
				parcelId: parcel.id,
				stockingPlace: item('Cave'),
				listingIds: [id],
				newListings: [{ ...draft(), model: { uuid: crypto.randomUUID(), value: 'x' } }]
			})
		).rejects.toThrow();
		expect((await db.select().from(parcels))[0].collected_at).toBeNull();
		expect((await statusOf(id)).map((row) => row.status)).toEqual([0]);
	});

	it('nouvel article : statut 0 daté du colis puis 6, pris en compte par les metrics', async () => {
		const parcel = await createParcel({ carrierId: 4 }, []);
		const past = new Date('2026-03-15T10:00:00Z');
		await db.update(parcels).set({ created_at: past }).where(eq(parcels.id, parcel.id));
		const result = await collectParcel({
			parcelId: parcel.id,
			stockingPlace: item('Cave'),
			listingIds: [],
			newListings: [draft()]
		});
		const [id] = result.created;
		const history = await statusOf(id);
		expect(history.map((row) => row.status)).toEqual([0, 6]);
		expect(history[0].created_at).toEqual(past);
		const [row] = await db.select().from(listings).where(eq(listings.id, id));
		expect(row.parcel_id).toBe(parcel.id);
		const metrics = calculateMetrics(
			{
				currentYear: 2026,
				expenses: [],
				listings: [
					{
						id,
						purchasePrice: row.purchase_price,
						shippingPrice: row.shipping_price,
						listingPrice: null,
						salePrice: null,
						status: 6,
						purchasedAt: '2026-03-15',
						soldAt: null
					}
				]
			},
			2026
		);
		expect(metrics.months.find((month) => month.key === '2026-03')?.costs).toEqual({
			purchases: 1000,
			shipping: 200
		});
		expect(metrics.stock.find((entry) => entry.status === 6)?.count).toBe(1);
	});
});

describe('suppression', () => {
	it('supprime un colis non récupéré et ses photos sans toucher aux articles', async () => {
		const prepared = await preparePhotos([await barcode()]);
		const parcel = await createParcel({ carrierId: 1 }, prepared);
		const id = await newArticle();
		await db.update(listings).set({ parcel_id: parcel.id }).where(eq(listings.id, id));
		await deleteParcel(parcel.id);
		expect(await db.select().from(parcels)).toHaveLength(0);
		expect(await db.select().from(images)).toHaveLength(0);
		expect(await readdir(uploads)).toHaveLength(0);
		const [row] = await db.select().from(listings).where(eq(listings.id, id));
		expect(row.parcel_id).toBeNull();
		expect(await statusOf(id)).toHaveLength(1);
	});

	it('refuse de supprimer un colis récupéré', async () => {
		const parcel = await createParcel({ carrierId: 1 }, []);
		await collectParcel({
			parcelId: parcel.id,
			stockingPlace: null,
			listingIds: [],
			newListings: []
		});
		await expect(deleteParcel(parcel.id)).rejects.toThrow('ne peut pas être supprimé');
		expect(await db.select().from(parcels)).toHaveLength(1);
	});
});
