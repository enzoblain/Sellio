import { describe, expect, it } from 'vitest';
import {
	filterArticles,
	filtersFromParams,
	groupArticles,
	matchesQuery,
	multiplier,
	paramsFromFilters,
	profitOf,
	sortArticles,
	sortOptions,
	statusFromPath,
	type Article
} from './articles';

const make = (id: string, extra: Partial<Article> = {}): Article => ({
	id,
	modelId: `m${id}`,
	sizeId: 's1',
	colorId: 'c1',
	brand: 'Nike',
	model: 'Air Max',
	size: 'M',
	color: 'Noir',
	purchasePrice: 10,
	shippingPrice: 2,
	...extra
});

const items = [
	make('3', {
		brand: 'Adidas',
		model: 'Gazelle',
		color: 'Bleu',
		stockingPlace: 'Cave',
		salePrice: 40
	}),
	make('2', { brand: 'Nike', model: 'Air Max', size: 'L', stockingPlace: 'Garage', salePrice: 20 }),
	make('1', { brand: 'Nike', model: 'Dunk', reference: 'AB12', salePrice: null })
];

describe('recherche', () => {
	it('cherche sur marque, modèle, taille, couleur, stockage et référence', () => {
		expect(matchesQuery(items[0], 'adidas')).toBe(true);
		expect(matchesQuery(items[0], 'gazelle')).toBe(true);
		expect(matchesQuery(items[1], 'l')).toBe(true);
		expect(matchesQuery(items[0], 'bleu')).toBe(true);
		expect(matchesQuery(items[0], 'cave')).toBe(true);
		expect(matchesQuery(items[2], 'ab12')).toBe(true);
		expect(matchesQuery(items[2], 'gazelle')).toBe(false);
	});

	it('ignore casse et accents, tous les mots doivent correspondre', () => {
		const item = make('9', { color: 'Écru' });
		expect(matchesQuery(item, 'ECRU')).toBe(true);
		expect(matchesQuery(item, 'nike ecru')).toBe(true);
		expect(matchesQuery(item, 'nike bleu')).toBe(false);
		expect(matchesQuery(item, '   ')).toBe(true);
	});
});

describe('filtres', () => {
	const none = { q: '', places: [], brands: [], models: [] };

	it('sans filtre, tout passe', () => {
		expect(filterArticles(items, none)).toHaveLength(3);
	});

	it('filtre par marque et par stockage (Non renseigné inclus)', () => {
		expect(filterArticles(items, { ...none, brands: ['Nike'] }).map((i) => i.id)).toEqual([
			'2',
			'1'
		]);
		expect(filterArticles(items, { ...none, places: ['Cave', 'Garage'] }).map((i) => i.id)).toEqual(
			['3', '2']
		);
		expect(filterArticles(items, { ...none, places: ['Non renseigné'] }).map((i) => i.id)).toEqual([
			'1'
		]);
	});

	it('filtre par modèle', () => {
		expect(
			filterArticles(items, { ...none, models: ['Air Max', 'Dunk'] }).map((i) => i.id)
		).toEqual(['2', '1']);
		expect(filterArticles(items, { ...none, brands: ['Adidas'], models: ['Dunk'] })).toEqual([]);
	});

	it('combine recherche et filtres', () => {
		expect(
			filterArticles(items, { q: 'max', places: [], brands: ['Nike'], models: [] }).map((i) => i.id)
		).toEqual(['2']);
	});
});

describe('tri', () => {
	it('« récent » garde l’ordre du serveur', () => {
		expect(sortArticles(items, 'recent')).toBe(items);
	});

	it('trie par prix croissant et décroissant', () => {
		expect(sortArticles(items, 'price-asc').map((i) => i.id)).toEqual(['1', '2', '3']);
		expect(sortArticles(items, 'price-desc').map((i) => i.id)).toEqual(['3', '2', '1']);
	});

	it('trie par bénéfice, les non calculables en dernier, sans muter', () => {
		const copy = [...items];
		expect(sortArticles(items, 'profit').map((i) => i.id)).toEqual(['3', '2', '1']);
		expect(profitOf(items[0])).toBe(28);
		expect(profitOf(items[2])).toBeNull();
		expect(items).toEqual(copy);
	});

	it('le tri bénéfice n’existe que sur À expédier et Expédié', () => {
		const has = (s: Parameters<typeof sortOptions>[0]) =>
			sortOptions(s).some((o) => o.value === 'profit');
		expect(has('to-ship')).toBe(true);
		expect(has('shipped')).toBe(true);
		expect(has('stock')).toBe(false);
		expect(has('listed')).toBe(false);
		expect(has('to-collect')).toBe(false);
	});
});

describe('piles', () => {
	it('regroupe modèle + taille + couleur', () => {
		const a = make('1', { modelId: 'm', sizeId: 's', colorId: 'c' });
		const b = make('2', { modelId: 'm', sizeId: 's', colorId: 'c' });
		const c = make('3', { modelId: 'm', sizeId: 's2', colorId: 'c' });
		const groups = groupArticles([a, c, b]);
		expect(groups.map((g) => g.articles.map((i) => i.id))).toEqual([['1', '2'], ['3']]);
	});
});

describe('URL', () => {
	it('lit q, sort, place, brand et model', () => {
		const params = new URLSearchParams(
			'q=nike&sort=price-asc&place=Cave&place=Garage&brand=Nike&model=Dunk'
		);
		expect(filtersFromParams(params, 'stock')).toEqual({
			q: 'nike',
			sort: 'price-asc',
			places: ['Cave', 'Garage'],
			brands: ['Nike'],
			models: ['Dunk']
		});
	});

	it('ignore un tri inconnu ou indisponible pour le statut', () => {
		expect(filtersFromParams(new URLSearchParams('sort=profit'), 'stock').sort).toBe('recent');
		expect(filtersFromParams(new URLSearchParams('sort=profit'), 'shipped').sort).toBe('profit');
		expect(filtersFromParams(new URLSearchParams('sort=nimporte'), 'shipped').sort).toBe('recent');
	});

	it('aller-retour, et rien dans l’URL par défaut', () => {
		const filters = {
			q: 'a b',
			sort: 'price-desc' as const,
			places: ['Cave'],
			brands: ['Nike'],
			models: ['Air Max']
		};
		expect(filtersFromParams(paramsFromFilters(filters), 'stock')).toEqual(filters);
		expect(paramsFromFilters(filtersFromParams(new URLSearchParams())).toString()).toBe('');
	});
});

describe('divers', () => {
	it('statusFromPath ne reconnaît que les 5 routes', () => {
		expect(statusFromPath('/to-ship')).toBe('to-ship');
		expect(statusFromPath('/to-collect/insert')).toBeUndefined();
	});

	it('multiplier', () => {
		expect(multiplier(30, 12)).toBe('×2,5');
		expect(multiplier(30, 0)).toBe('—');
	});
});
