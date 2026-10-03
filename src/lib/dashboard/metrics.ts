export type DashboardData = {
	currentYear: number;
	listings: {
		id: string;
		purchasePrice: number;
		shippingPrice: number;
		salePrice: number | null;
		status: number | null;
		purchasedAt: string | null;
		soldAt: string | null;
	}[];
	expenses: { price: number; date: string | null; categoryId: string; category: string }[];
};
const dateMonth = (date: string | null) => (date ? date.slice(0, 7) : null);

export function calculateMetrics(data: DashboardData, year: number) {
	const months = Array.from({ length: 12 }, (_, index) => ({
		key: `${year}-${String(index + 1).padStart(2, '0')}`,
		revenue: 0,
		costs: {} as Record<string, number>
	}));
	const categories = [
		{ id: 'purchases', name: 'Achats d’articles', color: '#7c3aed' },
		{ id: 'shipping', name: 'Frais de port d’achat', color: '#c4b5fd' },
		...Array.from(
			new Map(data.expenses.map((expense) => [expense.categoryId, expense.category])).entries()
		)
			.sort((a, b) => a[1].localeCompare(b[1]))
			.map(([id, name], index) => ({
				id,
				name,
				color: ['#f59e0b', '#0ea5e9', '#f43f5e', '#14b8a6', '#a855f7', '#84cc16'][index % 6]
			}))
	];
	const sold = data.listings.filter(
		(item) =>
			item.status !== null &&
			[2, 3, 4].includes(item.status) &&
			item.salePrice !== null &&
			item.soldAt?.startsWith(`${year}-`)
	);
	for (const item of data.listings) {
		const purchasedMonth = months.find((month) => month.key === dateMonth(item.purchasedAt));
		if (purchasedMonth) {
			purchasedMonth.costs.purchases = (purchasedMonth.costs.purchases ?? 0) + item.purchasePrice;
			purchasedMonth.costs.shipping = (purchasedMonth.costs.shipping ?? 0) + item.shippingPrice;
		}
	}
	for (const item of sold) {
		const month = months.find((month) => month.key === dateMonth(item.soldAt));
		if (month) month.revenue += item.salePrice!;
	}
	let operatingExpenses = 0;
	for (const expense of data.expenses) {
		const month = months.find((month) => month.key === dateMonth(expense.date));
		if (month) {
			month.costs[expense.categoryId] = (month.costs[expense.categoryId] ?? 0) + expense.price;
			operatingExpenses += expense.price;
		}
	}
	const revenue = sold.reduce((sum, item) => sum + item.salePrice!, 0);
	const profit = sold.reduce(
		(sum, item) => sum + item.salePrice! - item.purchasePrice - item.shippingPrice,
		0
	);
	const ratios = sold
		.filter((item) => item.purchasePrice + item.shippingPrice > 0)
		.map((item) => item.salePrice! / (item.purchasePrice + item.shippingPrice));
	const totalExpenses = months.reduce(
		(sum, month) => sum + Object.values(month.costs).reduce((a, b) => a + b, 0),
		0
	);
	return {
		months,
		categories,
		revenue,
		profit,
		totalExpenses,
		operatingExpenses,
		soldCount: sold.length,
		averageProfit: sold.length ? profit / sold.length : null,
		averageRatio: ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null,
		cashBalance: revenue - totalExpenses,
		netProfit: profit - operatingExpenses,
		stock: [0, 1, 2, 3].map((status) => ({
			status,
			count: data.listings.filter(
				(item) => item.status === status || (status === 0 && item.status === null)
			).length
		})),
		undatedExpenses: data.expenses
			.filter((expense) => !expense.date)
			.reduce((sum, expense) => sum + expense.price, 0),
		undatedPurchases: data.listings.filter((item) => !item.purchasedAt).length,
		zeroCostSales: sold.length - ratios.length
	};
}
