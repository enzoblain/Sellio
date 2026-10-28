import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
	url: new URL('http://localhost/stock')
}));
const goto = vi.hoisted(() => vi.fn());

vi.mock('$app/state', () => ({
	page: {
		get url() {
			return state.url;
		}
	}
}));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

const row = (id: string, brand: string, extra = {}) => ({
	id,
	modelId: `m${id}`,
	sizeId: 's',
	colorId: 'c',
	brand,
	model: `Modèle ${id}`,
	size: 'M',
	color: 'Noir',
	purchasePrice: 10,
	shippingPrice: 2,
	stockingPlace: id === '1' ? 'Cave' : 'Garage',
	...extra
});
const resource = (current: unknown[] | undefined, error?: unknown) => ({
	current,
	error,
	refresh: vi.fn()
});
const remote = vi.hoisted(() => ({ data: {} as Record<string, unknown> }));
vi.mock('$lib/remote/listings.remote', () => ({
	getToCollectListings: () => remote.data.toCollect,
	getStockListings: () => remote.data.stock,
	getListedListings: () => remote.data.listed,
	getToShipListings: () => remote.data.toShip,
	getShippedListings: () => remote.data.shipped
}));

import Layout from './+layout.svelte';
import ArticleListHarness from '$lib/components/listings/ArticleListHarness.svelte';
import { getArticlesContext } from '$lib/components/listings/context';

vi.mock('$lib/components/listings/ListingEditor.svelte', () => ({ default: () => {} }));
vi.mock('$lib/components/images/ListingGallery.svelte', () => ({ default: () => {} }));

const children = createRawSnippet(() => ({ render: () => '<p>contenu de page</p>' }));

beforeEach(() => {
	state.url = new URL('http://localhost/stock');
	goto.mockReset();
	localStorage.clear();
	remote.data = {
		toCollect: resource([row('9', 'Nike'), row('8', 'Nike')]),
		stock: resource([row('1', 'Nike'), row('2', 'Adidas'), row('3', 'Adidas')]),
		listed: resource([]),
		toShip: resource([row('4', 'Nike')]),
		shipped: resource([row('5', 'Nike'), row('6', 'Nike'), row('7', 'Nike'), row('10', 'Nike')])
	};
});

describe('layout Articles', () => {
	it('affiche les 5 statuts en onglets avec compteurs et URL inchangées', () => {
		render(Layout, { children });
		const nav = screen.getByRole('navigation', { name: 'Statuts des articles' });
		const links = within(nav).getAllByRole('link');
		expect(links.map((a) => a.textContent?.trim())).toEqual([
			'À récupérer (2)',
			'Stock (3)',
			'En vente (0)',
			'À expédier (1)',
			'Expédié (4)'
		]);
		expect(links.map((a) => a.getAttribute('href'))).toEqual([
			'/to-collect',
			'/stock',
			'/listed',
			'/to-ship',
			'/shipped'
		]);
		expect(within(nav).getByRole('link', { name: /Stock/ })).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(screen.getByText('contenu de page')).toBeInTheDocument();
	});

	it('affiche l’erreur avec Réessayer, puis rien tant que ça charge', async () => {
		remote.data.stock = resource(undefined, new Error('boom'));
		const { unmount } = render(Layout, { children });
		await fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
		expect(remote.data.stock).toHaveProperty('refresh');
		expect((remote.data.stock as { refresh: ReturnType<typeof vi.fn> }).refresh).toHaveBeenCalled();
		unmount();
		remote.data.stock = resource(undefined);
		render(Layout, { children });
		expect(screen.getByText('Chargement des commandes…')).toBeInTheDocument();
		expect(screen.queryByText('contenu de page')).not.toBeInTheDocument();
	});

	it('reflète la recherche dans l’URL (remplacement, sans empiler l’historique)', async () => {
		render(Layout, { children });
		await fireEvent.input(screen.getByRole('searchbox', { name: 'Rechercher un article' }), {
			target: { value: 'nike' }
		});
		await waitFor(() =>
			expect(goto).toHaveBeenLastCalledWith(
				'/stock?q=nike',
				expect.objectContaining({ replaceState: true })
			)
		);
	});

	it('reflète tri et filtres dans l’URL', async () => {
		render(Layout, { children });
		await fireEvent.change(screen.getByRole('combobox', { name: 'Trier par' }), {
			target: { value: 'price-asc' }
		});
		await waitFor(() =>
			expect(goto).toHaveBeenLastCalledWith('/stock?sort=price-asc', expect.anything())
		);
		const marques = screen.getByRole('group', { name: 'Filtrer par marque' });
		await fireEvent.click(within(marques).getByRole('button', { name: 'Adidas' }));
		await waitFor(() =>
			expect(goto).toHaveBeenLastCalledWith('/stock?sort=price-asc&brand=Adidas', expect.anything())
		);
		const lieux = screen.getByRole('group', { name: 'Filtrer par stockage' });
		await fireEvent.click(within(lieux).getByRole('button', { name: 'Cave' }));
		await waitFor(() =>
			expect(goto).toHaveBeenLastCalledWith(
				'/stock?sort=price-asc&place=Cave&brand=Adidas',
				expect.anything()
			)
		);
	});

	it('restaure recherche, tri et filtres depuis l’URL et ne navigue pas', () => {
		state.url = new URL('http://localhost/stock?q=nike&sort=price-desc&brand=Nike');
		render(Layout, { children });
		expect(screen.getByRole('searchbox')).toHaveValue('nike');
		expect(screen.getByRole('combobox', { name: 'Trier par' })).toHaveValue('price-desc');
		expect(screen.getByRole('button', { name: 'Nike' })).toHaveAttribute('aria-pressed', 'true');
		expect(goto).not.toHaveBeenCalled();
	});

	it('le tri par bénéfice n’est proposé que sur À expédier / Expédié', () => {
		const { unmount } = render(Layout, { children });
		expect(screen.queryByRole('option', { name: 'Bénéfice' })).not.toBeInTheDocument();
		unmount();
		state.url = new URL('http://localhost/to-ship');
		render(Layout, { children });
		expect(screen.getByRole('option', { name: 'Bénéfice' })).toBeInTheDocument();
	});

	it('la liste est la vue par défaut ; le choix de vue est mémorisé', async () => {
		render(Layout, { children });
		expect(screen.getByRole('radio', { name: 'Liste' })).toBeChecked();
		await fireEvent.click(screen.getByRole('radio', { name: 'Grille' }));
		expect(localStorage.getItem('articles-view')).toBe('grid');
	});

	it('relit la vue mémorisée', async () => {
		localStorage.setItem('articles-view', 'grid');
		render(Layout, { children });
		await waitFor(() => expect(screen.getByRole('radio', { name: 'Grille' })).toBeChecked());
	});

	it('partage aux pages les articles filtrés et triés', () => {
		state.url = new URL('http://localhost/stock?brand=Adidas&sort=price-desc');
		let seen: string[] = [];
		const probe = createRawSnippet(() => ({
			render: () => {
				seen = getArticlesContext().items.map((item) => item.id);
				return '<p>sonde</p>';
			}
		}));
		render(Layout, { children: probe });
		expect(seen).toEqual(['2', '3']);
	});
});

describe('ArticleList', () => {
	const context = (view: 'list' | 'grid', items: unknown[], total = items.length) =>
		({ items, total, view }) as never;
	const stack = [row('1', 'Nike', { modelId: 'm', id: '1' }), row('2', 'Nike', { modelId: 'm' })];

	it('liste : piles en lignes groupées ×N, dépliables', async () => {
		render(ArticleListHarness, { shared: context('list', stack) });
		expect(screen.getAllByRole('listitem')).toHaveLength(1);
		const toggle = screen.getByRole('button', { name: 'Déplier les 2 articles' });
		expect(toggle).toHaveTextContent('×2');
		await fireEvent.click(toggle);
		expect(screen.getAllByRole('listitem')).toHaveLength(2);
		expect(screen.getByRole('button', { name: 'Replier les 2 articles' })).toBeInTheDocument();
	});

	it('grille : conserve les piles', () => {
		render(ArticleListHarness, { shared: context('grid', stack) });
		expect(screen.getByRole('button', { name: 'Déplier les 2 articles' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Récupéré/ })).toBeInTheDocument();
	});

	it('affiche l’action nommée de la page', () => {
		render(ArticleListHarness, { shared: context('list', [stack[0]]) });
		expect(screen.getByRole('button', { name: 'Récupéré : Modèle 1' })).toBeInTheDocument();
	});

	it('vide : message du statut, ou « aucun résultat » si des filtres masquent tout', () => {
		const { unmount } = render(ArticleListHarness, { shared: context('list', [], 0) });
		expect(screen.getByText('Rien ici.')).toBeInTheDocument();
		unmount();
		render(ArticleListHarness, { shared: context('list', [], 5) });
		expect(screen.getByText('Aucun article ne correspond à ta recherche.')).toBeInTheDocument();
	});
});
