import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Pipeline from './Pipeline.svelte';

const stock = [
	{ status: 0, count: 2 },
	{ status: 6, count: 0 },
	{ status: 1, count: 5 },
	{ status: 2, count: 1 },
	{ status: 3, count: 7 }
];

describe('Pipeline', () => {
	it('affiche les 5 statuts dans l’ordre avec leur compteur', () => {
		render(Pipeline, { stock });
		const links = screen.getAllByRole('link');
		expect(links.map((link) => link.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
			'À récupérer 2',
			'En stock 0',
			'En vente 5',
			'À expédier 1',
			'Expédié 7'
		]);
	});

	it('pointe vers les bons onglets Articles', () => {
		render(Pipeline, { stock });
		const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
		expect(hrefs).toEqual(['/to-collect', '/stock', '/listed', '/to-ship', '/shipped']);
	});

	it('ne dessine pas de segment pour un statut vide', () => {
		render(Pipeline, { stock });
		expect(screen.getAllByTestId('pipeline-segment')).toHaveLength(4);
	});

	it('place une pastille de la couleur du segment devant chaque statut', () => {
		render(Pipeline, { stock });
		const dots = screen.getAllByTestId('pipeline-dot');
		expect(dots).toHaveLength(5);
		const segments = screen.getAllByTestId('pipeline-segment');
		expect(dots[0].style.background).toBe((segments[0] as HTMLElement).style.background);
		expect(dots[2].style.background).toBe((segments[1] as HTMLElement).style.background);
	});
});
