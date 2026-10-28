import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const remote = vi.hoisted(() => ({ createListing: vi.fn() }));
vi.mock('$lib/remote/listings.remote', () => remote);
vi.mock('$lib/remote/brands.remote', () => ({ searchBrands: vi.fn() }));
vi.mock('$lib/remote/models.remote', () => ({ searchModels: vi.fn() }));
vi.mock('$lib/remote/sizes.remote', () => ({ searchSizes: vi.fn() }));
vi.mock('$lib/remote/colors.remote', () => ({ searchColors: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));
vi.mock('$lib/components/listings/refresh-views', () => ({
	refreshListingViews: vi.fn().mockResolvedValue(undefined)
}));
vi.mock('$lib/components/images/ModelPhotos.svelte', () => ({ default: () => {} }));
vi.mock('$lib/components/images/PhotoPicker.svelte', () => ({ default: () => {} }));
vi.mock('$lib/components/form/Autocomplete.svelte', async () => ({
	default: (await import('$lib/components/form/AutocompleteStub.svelte')).default
}));

import Page from './+page.svelte';

const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;

beforeEach(() => {
	remote.createListing.mockReset();
	remote.createListing.mockResolvedValue({ id: 'new-1' });
});

describe('Ajouter et en créer un autre', () => {
	it('garde marque et modèle, vide le reste et met le focus sur Taille', async () => {
		render(Page);
		await fireEvent.input(field('Marque'), { target: { value: 'Nike' } });
		await fireEvent.input(field('Modèle'), { target: { value: 'Air' } });
		await fireEvent.input(field('Taille'), { target: { value: 'M' } });
		await fireEvent.input(field('Couleur'), { target: { value: 'Noir' } });
		await fireEvent.input(field("Prix de l'article"), { target: { value: '10' } });
		await fireEvent.input(field('Frais de port'), { target: { value: '2' } });

		await fireEvent.click(screen.getByRole('button', { name: 'Ajouter et en créer un autre' }));

		await waitFor(() => expect(document.activeElement).toBe(field('Taille')));
		expect(remote.createListing).toHaveBeenCalledTimes(1);
		expect(field('Marque').value).toBe('Nike');
		expect(field('Modèle').value).toBe('Air');
		expect(field('Taille').value).toBe('');
		expect(field('Couleur').value).toBe('');
		expect(field("Prix de l'article").value).toBe('');
		expect(field('Frais de port').value).toBe('');
	});
});
