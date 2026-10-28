import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/stock') } }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));

import Navbar from '$lib/components/layout/Navbar.svelte';
import Stat from './Stat.svelte';

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
