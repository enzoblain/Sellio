import {
	getToCollectListings,
	getStockListings,
	getListedListings,
	getToShipListings,
	getShippedListings
} from '$lib/remote/listings.remote';
import { getDashboard } from '$lib/remote/dashboard.remote';
import { getListingImages } from '$lib/remote/images.remote';
export async function refreshListingViews(id: string) {
	await Promise.all([
		getToCollectListings().refresh(),
		getStockListings().refresh(),
		getListedListings().refresh(),
		getToShipListings().refresh(),
		getShippedListings().refresh(),
		getDashboard().refresh(),
		getListingImages(id).refresh()
	]);
}
