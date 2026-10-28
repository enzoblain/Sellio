export const STATUS_TABS = [
	{ id: 'to-collect', label: 'À récupérer', href: '/to-collect' },
	{ id: 'stock', label: 'Stock', href: '/stock' },
	{ id: 'listed', label: 'En vente', href: '/listed' },
	{ id: 'to-ship', label: 'À expédier', href: '/to-ship' },
	{ id: 'shipped', label: 'Expédié', href: '/shipped' }
] as const;

export type ArticleStatus = (typeof STATUS_TABS)[number]['id'];

export type Article = {
	id: string;
	modelId: string;
	sizeId: string;
	colorId: string;
	brand: string;
	model: string;
	size?: string;
	color?: string;
	purchasePrice: number;
	shippingPrice: number;
	listingPrice?: number | null;
	salePrice?: number | null;
	reference?: string | null;
	stockingPlace?: string | null;
};

/** Libellés des statuts en base (index = valeur du statut). */
export const STATUS_LABELS = [
	'À récupérer',
	'Listé / en vente',
	'À expédier',
	'Expédié',
	'Terminé',
	'Retourné',
	'En stock'
];

export type SortKey = 'recent' | 'price-asc' | 'price-desc' | 'profit';

export type ArticleFilters = {
	q: string;
	sort: SortKey;
	places: string[];
	brands: string[];
};

export const NO_PLACE = 'Non renseigné';

export function statusFromPath(pathname: string): ArticleStatus | undefined {
	return STATUS_TABS.find((tab) => pathname === tab.href)?.id;
}

export function sortOptions(status: ArticleStatus): { value: SortKey; label: string }[] {
	const options: { value: SortKey; label: string }[] = [
		{ value: 'recent', label: 'Plus récents' },
		{ value: 'price-asc', label: 'Prix croissant' },
		{ value: 'price-desc', label: 'Prix décroissant' }
	];
	if (status === 'to-ship' || status === 'shipped') {
		options.push({ value: 'profit', label: 'Bénéfice' });
	}
	return options;
}

export function totalCost(item: Article) {
	return item.purchasePrice + item.shippingPrice;
}

export function profitOf(item: Article) {
	return item.salePrice == null ? null : item.salePrice - totalCost(item);
}

/** Multiplicateur vente / achat total, « — » quand l'achat est nul. */
export function multiplier(salePrice: number, total: number) {
	return total > 0
		? `×${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(salePrice / total)}`
		: '—';
}

/** Prix de référence de l'article selon son statut : vendu, mis en vente, sinon coût d'achat. */
export function priceOf(item: Article) {
	return item.salePrice ?? item.listingPrice ?? totalCost(item);
}

const normalize = (value: string) =>
	value
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();

/** Tous les mots de la recherche doivent apparaître dans l'un des champs de l'article. */
export function matchesQuery(item: Article, q: string) {
	const words = normalize(q).split(/\s+/).filter(Boolean);
	if (words.length === 0) return true;
	const haystack = normalize(
		[item.brand, item.model, item.size, item.color, item.stockingPlace, item.reference]
			.filter(Boolean)
			.join(' ')
	);
	return words.every((word) => haystack.includes(word));
}

export function filterArticles<T extends Article>(
	items: T[],
	filters: Omit<ArticleFilters, 'sort'>
) {
	return items.filter(
		(item) =>
			matchesQuery(item, filters.q) &&
			(filters.places.length === 0 || filters.places.includes(item.stockingPlace ?? NO_PLACE)) &&
			(filters.brands.length === 0 || filters.brands.includes(item.brand))
	);
}

export function sortArticles<T extends Article>(items: T[], sort: SortKey) {
	if (sort === 'recent') return items;
	const sorted = [...items];
	if (sort === 'price-asc') return sorted.sort((a, b) => priceOf(a) - priceOf(b));
	if (sort === 'price-desc') return sorted.sort((a, b) => priceOf(b) - priceOf(a));
	// Les articles sans bénéfice calculable passent en dernier.
	return sorted.sort((a, b) => (profitOf(b) ?? -Infinity) - (profitOf(a) ?? -Infinity));
}

/** Valeurs distinctes triées, pour les chips de filtre. */
export function distinct(values: string[]) {
	return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Piles : mêmes modèle, taille et couleur. L'ordre du premier article de chaque pile est conservé. */
export function groupArticles<T extends Article>(items: T[]) {
	const map = new Map<string, T[]>();
	for (const item of items) {
		const key = `${item.modelId}:${item.sizeId}:${item.colorId}`;
		const group = map.get(key);
		if (group) group.push(item);
		else map.set(key, [item]);
	}
	return [...map].map(([key, articles]) => ({ key, articles }));
}

const SORTS: SortKey[] = ['recent', 'price-asc', 'price-desc', 'profit'];

export function filtersFromParams(params: URLSearchParams, status?: ArticleStatus): ArticleFilters {
	const sort = params.get('sort') as SortKey;
	const allowed = status ? sortOptions(status).map((option) => option.value) : SORTS;
	return {
		q: params.get('q') ?? '',
		sort: allowed.includes(sort) ? sort : 'recent',
		// Pas de stockage avant la récupération : le filtre n'a pas de sens (et serait invisible).
		places: status === 'to-collect' ? [] : params.getAll('place'),
		brands: params.getAll('brand')
	};
}

export function paramsFromFilters(filters: ArticleFilters) {
	const params = new URLSearchParams();
	if (filters.q.trim()) params.set('q', filters.q);
	if (filters.sort !== 'recent') params.set('sort', filters.sort);
	for (const place of filters.places) params.append('place', place);
	for (const brand of filters.brands) params.append('brand', brand);
	return params;
}
