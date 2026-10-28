import { command, query } from '$app/server';
import * as v from 'valibot';
import {
	CollectParcelSchema,
	collectParcel,
	deleteParcel,
	listCarriers,
	listCollectedParcels,
	listParcelsToCollect
} from '$lib/server/parcels';
import { getDashboard } from './dashboard.remote';
import { getStockListings, getToCollectListings } from './listings.remote';

export const getCarriers = query(async () => listCarriers());
export const getParcelsToCollect = query(async () => listParcelsToCollect());
export const getCollectedParcels = query(async () => listCollectedParcels());

export const markParcelCollected = command(CollectParcelSchema, async (input) => {
	const result = await collectParcel(input);
	await Promise.all([
		getParcelsToCollect().refresh(),
		getCollectedParcels().refresh(),
		getToCollectListings().refresh(),
		getStockListings().refresh(),
		getDashboard().refresh()
	]);
	return result;
});

export const removeParcel = command(v.pipe(v.string(), v.uuid()), async (parcelId) => {
	await deleteParcel(parcelId);
	await getParcelsToCollect().refresh();
});
