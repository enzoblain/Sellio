import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/stock') } }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));
const parcels = vi.hoisted(() => ({ current: undefined as unknown[] | undefined }));
vi.mock('$lib/remote/parcels.remote', () => ({
	getParcelsToCollect: () => ({
		get current() {
			return parcels.current;
		}
	})
}));

import Navbar from '$lib/components/layout/Navbar.svelte';
import ListingCard from './ListingCard.svelte';
import Stat from './Stat.svelte';

vi.mock('./ListingEditor.svelte', () => ({ default: () => {} }));
vi.mock('$lib/components/images/ListingGallery.svelte', () => ({ default: () => {} }));

describe('Stat', () => {
	it('affiche libellé, valeur et ton', () => {
		render(Stat, { label: 'Bénéfice', value: '12,00 €', tone: 'danger', title: 'info' });
		expect(screen.getByText('Bénéfice')).toBeInTheDocument();
		const value = screen.getByText('12,00 €');
		expect(value).toHaveClass('text-danger');
		expect(value).toHaveAttribute('title', 'info');
	});

	it('aligne à droite sur demande', () => {
		render(Stat, { label: 'Prix', value: '—', align: 'right' });
		expect(screen.getByText('Prix').parentElement).toHaveClass('text-right');
	});
});

describe('Navbar', () => {
	it('liste les 4 sections et le bouton Nouvel article, Articles actif sur /stock', () => {
		window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
		const { container } = render(Navbar);
		const labels = [...container.querySelectorAll('nav')[0].querySelectorAll('a')].map((a) =>
			a.textContent?.trim()
		);
		expect(labels).toEqual(['Nouvel article', 'Tableau de bord', 'Articles', 'Colis', 'Dépenses']);
		const articles = screen.getAllByRole('link', { name: 'Articles' })[0];
		expect(articles).toHaveClass('bg-surface-2');
		expect(articles).toHaveAttribute('aria-current', 'page');
		expect(screen.getAllByRole('link', { name: 'Dépenses' })[0]).not.toHaveAttribute(
			'aria-current'
		);
	});

	it('affiche le compteur de colis à récupérer', () => {
		parcels.current = [{}, {}];
		render(Navbar);
		expect(screen.getAllByTestId('parcel-count').map((el) => el.textContent?.trim())).toEqual([
			'Colis à récupérer :2',
			'Colis à récupérer :2'
		]);
		parcels.current = undefined;
	});

	it('la barre latérale se replie et mémorise son état', async () => {
		localStorage.clear();
		render(Navbar);
		const toggle = screen.getAllByRole('button', { name: 'Replier la barre latérale' })[0];
		await fireEvent.click(toggle);
		expect(localStorage.getItem('sidebar-collapsed')).toBe('1');
		expect(screen.getAllByRole('button', { name: 'Déplier la barre latérale' })[0]).toHaveAttribute(
			'aria-expanded',
			'false'
		);
		await fireEvent.click(screen.getAllByRole('button', { name: 'Déplier la barre latérale' })[0]);
		expect(localStorage.getItem('sidebar-collapsed')).toBe('0');
	});

	it('place le ThemeToggle mobile dans une barre en flux normal', async () => {
		render(Navbar);
		const toggles = await screen.findAllByRole('button', { name: /thème/ });
		expect(toggles).toHaveLength(2);
		for (const toggle of toggles) expect(toggle.closest('.fixed.right-2')).toBeNull();
	});
});

describe('ListingCard', () => {
	const text = (value: string) =>
		createRawSnippet(() => ({ render: () => `<span>${value}</span>` }));
	const item = { id: 'a1', brand: 'Nike', model: 'Air' };

	it('rend le contenu, l’action à côté de la pile, et omet footer/extra par défaut', () => {
		const { container } = render(ListingCard, {
			item,
			stackButton: text('PILE'),
			action: text('ACTION'),
			children: text('CORPS'),
			onopen: vi.fn()
		});
		expect(screen.getByText('CORPS')).toBeInTheDocument();
		const action = screen.getByText('ACTION').parentElement!;
		expect(action).toBe(screen.getByText('PILE').parentElement);
		expect(container.querySelectorAll('.border-t')).toHaveLength(0);
	});

	it('affiche footer et extra seulement s’ils sont fournis', () => {
		const { container } = render(ListingCard, {
			item,
			stackButton: text('PILE'),
			children: text('CORPS'),
			footer: text('FOOTER'),
			extra: text('EXTRA'),
			onopen: vi.fn()
		});
		expect(screen.getByText('FOOTER')).toBeInTheDocument();
		expect(screen.getByText('EXTRA')).toBeInTheDocument();
		expect(container.querySelectorAll('.border-t')).toHaveLength(2);
	});

	it('ouvre le détail au clic sur la photo, pas au clic sur un bouton de la photo', async () => {
		const onopen = vi.fn();
		const { container } = render(ListingCard, {
			item,
			stackButton: createRawSnippet(() => ({
				render: () => '<button type="button">PILE</button>'
			})),
			children: text('CORPS'),
			onopen
		});
		await fireEvent.click(container.querySelector('[role="presentation"]')!);
		expect(onopen).toHaveBeenCalledOnce();
		await fireEvent.click(screen.getByText('PILE'));
		expect(onopen).toHaveBeenCalledOnce();
	});
});
