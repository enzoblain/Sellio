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

vi.mock('$lib/components/listings/ArticleDetail.svelte', () => ({ default: () => {} }));
vi.mock('$lib/components/images/ListingGallery.svelte', () => ({ default: () => {} }));

const children = createRawSnippet(() => ({ render: () => '<p>contenu de page</p>' }));

const openFilters = async () => {
	await fireEvent.click(screen.getByRole('button', { name: /^Filtres/ }));
};

beforeEach(() => {
	HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
		this.setAttribute('open', '');
	};
	HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
		this.removeAttribute('open');
		this.dispatchEvent(new Event('close'));
	};
	state.url = new URL('http://localhost/stock');
	goto.mockReset();
	localStorage.clear();
	delete document.documentElement.dataset.articlesView;
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
		await openFilters();
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
		const modeles = screen.getByRole('group', { name: 'Filtrer par modèle' });
		await fireEvent.click(within(modeles).getByRole('button', { name: 'Modèle 2' }));
		await waitFor(() =>
			expect(goto).toHaveBeenLastCalledWith(
				'/stock?sort=price-asc&place=Cave&brand=Adidas&model=Mod%C3%A8le+2',
				expect.anything()
			)
		);
	});

	it('restaure recherche, tri et filtres depuis l’URL et ne navigue pas', () => {
		state.url = new URL('http://localhost/stock?q=nike&sort=price-desc&brand=Nike');
		render(Layout, { children });
		expect(screen.getByRole('searchbox')).toHaveValue('nike');
		expect(screen.getByRole('combobox', { name: 'Trier par' })).toHaveValue('price-desc');
		expect(screen.getByRole('button', { name: 'Filtres (1)' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Retirer le filtre Nike' })).toBeInTheDocument();
		expect(goto).not.toHaveBeenCalled();
	});

	it('garde visible un filtre actif dont plus aucun article ne dispose, et permet de le retirer', async () => {
		state.url = new URL('http://localhost/stock?brand=Zara&place=Cave');
		remote.data.stock = resource([row('2', 'Nike'), row('3', 'Nike')]);
		render(Layout, { children });
		await openFilters();
		const marques = screen.getByRole('group', { name: 'Filtrer par marque' });
		const zara = within(marques).getByRole('button', { name: 'Zara' });
		expect(zara).toHaveAttribute('aria-pressed', 'true');
		await fireEvent.click(zara);
		await waitFor(() =>
			expect(goto).toHaveBeenLastCalledWith('/stock?place=Cave', expect.anything())
		);
	});

	it('retire un filtre depuis son chip, ou tout via Réinitialiser', async () => {
		state.url = new URL('http://localhost/stock?brand=Nike&model=Mod%C3%A8le+1&place=Cave');
		render(Layout, { children });
		expect(screen.getByRole('button', { name: 'Filtres (3)' })).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Retirer le filtre Modèle 1' }));
		await waitFor(() =>
			expect(goto).toHaveBeenLastCalledWith('/stock?place=Cave&brand=Nike', expect.anything())
		);
		await fireEvent.click(screen.getAllByRole('button', { name: 'Réinitialiser' })[0]);
		await waitFor(() => expect(goto).toHaveBeenLastCalledWith('/stock', expect.anything()));
	});

	it('les modèles proposés suivent les marques cochées', async () => {
		state.url = new URL('http://localhost/stock?brand=Adidas');
		render(Layout, { children });
		await openFilters();
		const modeles = screen.getByRole('group', { name: 'Filtrer par modèle' });
		expect(
			within(modeles)
				.getAllByRole('button')
				.map((b) => b.textContent?.trim())
		).toEqual(['Modèle 2', 'Modèle 3']);
	});

	it('ignore le filtre de stockage sur À récupérer', async () => {
		state.url = new URL('http://localhost/to-collect?place=Cave');
		render(Layout, { children });
		await openFilters();
		expect(screen.queryByRole('group', { name: 'Filtrer par stockage' })).not.toBeInTheDocument();
		expect(goto).toHaveBeenCalledWith('/to-collect', expect.anything());
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
		document.documentElement.dataset.articlesView = 'grid';
		render(Layout, { children });
		expect(screen.getByRole('radio', { name: 'Grille' })).toBeChecked();
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

describe('panneau d’article (?id=)', () => {
	const probe = () => {
		let ctx: ReturnType<typeof getArticlesContext> | undefined;
		const snippet = createRawSnippet(() => ({
			render: () => {
				ctx = getArticlesContext();
				return '<p>sonde</p>';
			}
		}));
		return { snippet, ctx: () => ctx! };
	};

	it('open pousse ?id= en gardant les filtres (retour = fermeture)', () => {
		state.url = new URL('http://localhost/stock?brand=Adidas');
		const sonde = probe();
		render(Layout, { children: sonde.snippet });
		sonde.ctx().open('2');
		expect(goto).toHaveBeenCalledWith(
			'/stock?brand=Adidas&id=2',
			expect.not.objectContaining({ replaceState: true })
		);
	});

	it('?id= partagé : l’article est sélectionné, sans navigation parasite', () => {
		state.url = new URL('http://localhost/stock?id=2&sort=price-asc');
		const sonde = probe();
		render(Layout, { children: sonde.snippet });
		expect(sonde.ctx().selected?.id).toBe('2');
		expect(goto).not.toHaveBeenCalled();
	});

	it('une recherche garde ?id= dans l’URL', async () => {
		state.url = new URL('http://localhost/stock?id=2');
		render(Layout, { children });
		await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'nike' } });
		await waitFor(() =>
			expect(goto).toHaveBeenLastCalledWith('/stock?q=nike&id=2', expect.anything())
		);
	});

	it('un id inconnu est retiré de l’URL (remplacement)', async () => {
		state.url = new URL('http://localhost/stock?id=inconnu');
		render(Layout, { children });
		await waitFor(() =>
			expect(goto).toHaveBeenCalledWith('/stock', expect.objectContaining({ replaceState: true }))
		);
	});

	it('close retire ?id= quand le lien a été ouvert directement', () => {
		state.url = new URL('http://localhost/stock?id=2&brand=Adidas');
		const sonde = probe();
		render(Layout, { children: sonde.snippet });
		sonde.ctx().close();
		expect(goto).toHaveBeenCalledWith(
			'/stock?brand=Adidas',
			expect.objectContaining({ replaceState: true })
		);
	});

	it('close revient en arrière quand le panneau a été ouvert depuis la liste', () => {
		const back = vi.spyOn(history, 'back').mockImplementation(() => {});
		const sonde = probe();
		render(Layout, { children: sonde.snippet });
		sonde.ctx().open('2');
		state.url = new URL('http://localhost/stock?id=2');
		goto.mockClear();
		sonde.ctx().close();
		expect(back).toHaveBeenCalledOnce();
		expect(goto).not.toHaveBeenCalled();
		back.mockRestore();
	});
});

describe('ArticleList', () => {
	const context = (view: 'list' | 'grid', items: unknown[], total = items.length) =>
		({
			items,
			total,
			view,
			all: items,
			selected: undefined,
			reset: vi.fn(),
			open: vi.fn(),
			close: vi.fn()
		}) as never as ReturnType<typeof getArticlesContext> & {
			open: ReturnType<typeof vi.fn>;
		};
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

	it('liste : le titre et le reste de la ligne ouvrent le panneau, pas l’action', async () => {
		const shared = context('list', [stack[0]]);
		render(ArticleListHarness, { shared });
		await fireEvent.click(screen.getByRole('button', { name: 'Voir le détail : Nike Modèle 1' }));
		expect(shared.open).toHaveBeenCalledWith('1');
		shared.open.mockClear();
		await fireEvent.click(screen.getByRole('button', { name: 'Récupéré : Modèle 1' }));
		expect(shared.open).not.toHaveBeenCalled();
		await fireEvent.click(screen.getByRole('listitem').firstElementChild!.firstElementChild!);
		expect(shared.open).toHaveBeenCalledWith('1');
	});

	it('grille : le titre ouvre le panneau', async () => {
		const shared = context('grid', [stack[0]]);
		render(ArticleListHarness, { shared });
		await fireEvent.click(screen.getByRole('button', { name: 'Voir le détail : Nike Modèle 1' }));
		expect(shared.open).toHaveBeenCalledWith('1');
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

	it('vide : message du statut, ou « aucun résultat » si des filtres masquent tout', async () => {
		const { unmount } = render(ArticleListHarness, { shared: context('list', [], 0) });
		expect(screen.getByText('Rien ici.')).toBeInTheDocument();
		unmount();
		render(ArticleListHarness, { shared: context('list', [], 5) });
		expect(screen.getByText('Aucun article ne correspond à ta recherche.')).toBeInTheDocument();
	});
});
