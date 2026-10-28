import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/stock') } }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

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
	it('liste les 7 entrées dans l’ordre et marque l’active', () => {
		window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
		const { container } = render(Navbar);
		const labels = [...container.querySelectorAll('nav')[0].querySelectorAll('a')].map((a) =>
			a.textContent?.trim()
		);
		expect(labels).toEqual([
			'Dashboard',
			'À récupérer',
			'Stock',
			'En vente',
			'À expédier',
			'Expédié',
			'Dépenses'
		]);
		expect(screen.getAllByRole('link', { name: 'Stock' })[0]).toHaveClass('bg-surface-2');
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
			children: text('CORPS')
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
			extra: text('EXTRA')
		});
		expect(screen.getByText('FOOTER')).toBeInTheDocument();
		expect(screen.getByText('EXTRA')).toBeInTheDocument();
		expect(container.querySelectorAll('.border-t')).toHaveLength(2);
	});
});
