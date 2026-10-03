import { query } from '$app/server';
import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import {
	listings,
	listingStatusHistory,
	expenses,
	expenseObjects,
	expenseCategories
} from '$lib/server/db/schema';
import type { DashboardData } from '$lib/dashboard/metrics';

export const getDashboard = query(async (): Promise<DashboardData> => {
	const db = getDb();
	const latest = db
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
		.as('latest');
	const [items, costs] = await Promise.all([
		db
			.select({
				id: listings.id,
				purchasePrice: listings.purchase_price,
				shippingPrice: listings.shipping_price,
				salePrice: listings.sale_price,
				status: latest.status,
				purchasedAt: sql<
					string | null
				>`(select to_char(min(created_at) at time zone 'UTC' at time zone 'Europe/Paris', 'YYYY-MM-DD') from listing_status_history where listing_id = ${listings.id} and status = 0)`,
				soldAt: sql<
					string | null
				>`(select to_char(min(created_at) at time zone 'UTC' at time zone 'Europe/Paris', 'YYYY-MM-DD') from listing_status_history where listing_id = ${listings.id} and status = 2)`
			})
			.from(listings)
			.leftJoin(latest, eq(latest.listingId, listings.id)),
		db
			.select({
				price: expenses.price,
				date: sql<string>`to_char(${expenses.created_at} at time zone 'UTC' at time zone 'Europe/Paris', 'YYYY-MM-DD')`,
				categoryId: expenseCategories.id,
				category: expenseCategories.name
			})
			.from(expenses)
			.innerJoin(expenseObjects, eq(expenses.object_id, expenseObjects.id))
			.innerJoin(expenseCategories, eq(expenseObjects.category_id, expenseCategories.id))
	]);
	return {
		currentYear: Number(
			new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Europe/Paris' }).format(
				new Date()
			)
		),
		listings: items,
		expenses: costs
	};
});
