export type ExpenseRow = {
	id: number | string;
	name: string;
	category: string;
	price: number;
	date: string | null;
};

const normalize = (value: string) =>
	value
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();

/** Filtre par recherche (nom ou catégorie, sans accents ni casse) et par catégories (vide = toutes). */
export function filterExpenses<T extends ExpenseRow>(
	items: T[],
	search: string,
	categories: string[]
): T[] {
	const needle = normalize(search.trim());
	return items.filter(
		(item) =>
			(categories.length === 0 || categories.includes(item.category)) &&
			(needle === '' || normalize(`${item.name} ${item.category}`).includes(needle))
	);
}

/** Somme des montants (centimes). */
export const totalExpenses = (items: Pick<ExpenseRow, 'price'>[]) =>
	items.reduce((sum, item) => sum + item.price, 0);

export const expenseCategories = (items: Pick<ExpenseRow, 'category'>[]) =>
	[...new Set(items.map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'fr'));
