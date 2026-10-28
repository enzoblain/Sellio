import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from '$lib/components/ui/toast.svelte';
import type { Parcel } from '$lib/parcels';

const remote = vi.hoisted(() => ({
	toCollect: { current: undefined as unknown[] | undefined, error: undefined, refresh: vi.fn() },
	collected: { current: [] as unknown[], error: undefined, refresh: vi.fn() },
	listings: {
		current: [] as unknown[],
		error: undefined,
		refresh: vi.fn()
	},
	markParcelCollected: vi.fn()
}));
vi.mock('$lib/remote/parcels.remote', () => ({
	getParcelsToCollect: () => remote.toCollect,
	getCollectedParcels: () => remote.collected,
	removeParcel: vi.fn(),
	markParcelCollected: remote.markParcelCollected
}));
vi.mock('$lib/remote/listings.remote', () => ({ getToCollectListings: () => remote.listings }));
vi.mock('$lib/remote/stocking-places.remote', () => ({ searchStockingPlaces: vi.fn() }));
vi.mock('$lib/remote/brands.remote', () => ({ searchBrands: vi.fn() }));
vi.mock('$lib/remote/models.remote', () => ({ searchModels: vi.fn() }));
vi.mock('$lib/remote/sizes.remote', () => ({ searchSizes: vi.fn() }));
vi.mock('$lib/remote/colors.remote', () => ({ searchColors: vi.fn() }));
vi.mock('$lib/components/ui/toast.svelte', () => ({ toast: vi.fn() }));
vi.mock('$lib/components/form/Autocomplete.svelte', async () => ({
	default: (await import('$lib/components/form/AutocompleteStub.svelte')).default
}));

import ParcelsView from './ParcelsView.svelte';

const parcel = (id: string, extra: Partial<Parcel> = {}): Parcel => ({
	id,
	carrierId: 1,
	carrier: 'Colissimo',
	pickupPoint: null,
	pickupDeadline: null,
	trackingCode: null,
	createdAt: new Date('2026-10-01T10:00:00'),
	collectedAt: null,
	photos: [{ id: `p${id}`, path: `/images/${id}.webp` }],
	...extra
});

const article = (id: string, brand: string, model: string) => ({
	id,
	modelId: `m${id}`,
	sizeId: 's',
	colorId: 'c',
	brand,
	model,
	size: 'M',
	color: 'Noir',
	purchasePrice: 1000,
	shippingPrice: 200
});

const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;

async function openModal() {
	render(ParcelsView);
	await fireEvent.click(screen.getByRole('button', { name: /Code-barres/ }));
	await fireEvent.click(await screen.findByRole('button', { name: 'Récupéré' }));
}

beforeEach(() => {
	HTMLDialogElement.prototype.showModal = function () {
		this.setAttribute('open', '');
	};
	HTMLDialogElement.prototype.close = function () {
		this.removeAttribute('open');
		this.dispatchEvent(new Event('close'));
	};
	vi.mocked(toast).mockReset();
	remote.markParcelCollected.mockReset();
	remote.markParcelCollected.mockResolvedValue({ collected: ['a1'], skipped: [], created: [] });
	remote.toCollect.current = [parcel('1')];
	remote.listings.current = [
		article('a1', 'Nike', 'Air Max'),
		article('a2', 'Adidas', 'Samba'),
		article('a3', 'Nike', 'Dunk')
	];
});

describe('Modale Récupéré', () => {
	it('coche des articles, saisit le lieu une fois et récupère N articles', async () => {
		await openModal();
		const submit = screen.getByRole('button', { name: 'Récupérer sans article' });
		await fireEvent.click(screen.getByRole('checkbox', { name: /Nike Air Max/ }));
		await fireEvent.click(screen.getByRole('checkbox', { name: /Nike Dunk/ }));
		expect(screen.getByRole('button', { name: 'Récupérer 2 articles' })).toBe(submit);
		expect(submit).toBeDisabled();
		await fireEvent.input(field('Lieu de stockage'), { target: { value: 'Étagère A' } });
		await fireEvent.click(submit);
		await waitFor(() =>
			expect(remote.markParcelCollected).toHaveBeenCalledWith({
				parcelId: '1',
				stockingPlace: { value: 'Étagère A', uuid: null },
				listingIds: ['a1', 'a3'],
				newListings: []
			})
		);
		await waitFor(() => expect(toast).toHaveBeenCalledWith('1 article récupéré, placé en stock'));
	});

	it('filtre la liste avec la recherche sans perdre la sélection', async () => {
		await openModal();
		await fireEvent.click(screen.getByRole('checkbox', { name: /Adidas Samba/ }));
		await fireEvent.input(screen.getByLabelText('Rechercher un article'), {
			target: { value: 'nike' }
		});
		expect(screen.queryByRole('checkbox', { name: /Adidas Samba/ })).toBeNull();
		expect(screen.getAllByRole('checkbox')).toHaveLength(2);
		expect(screen.getByRole('button', { name: 'Récupérer 1 article' })).toBeInTheDocument();
	});

	it('demande une confirmation avec 0 article coché', async () => {
		remote.markParcelCollected.mockResolvedValue({ collected: [], skipped: [], created: [] });
		await openModal();
		await fireEvent.click(screen.getByRole('button', { name: 'Récupérer sans article' }));
		expect(remote.markParcelCollected).not.toHaveBeenCalled();
		await fireEvent.click(await screen.findByRole('button', { name: 'Confirmer' }));
		await waitFor(() =>
			expect(remote.markParcelCollected).toHaveBeenCalledWith({
				parcelId: '1',
				stockingPlace: null,
				listingIds: [],
				newListings: []
			})
		);
		await waitFor(() => expect(toast).toHaveBeenCalledWith('Colis passé en Récupérés'));
	});

	it('ajoute un nouvel article, envoyé avec la récupération', async () => {
		remote.markParcelCollected.mockResolvedValue({ collected: [], skipped: [], created: ['n1'] });
		await openModal();
		await fireEvent.click(screen.getByRole('button', { name: 'Nouvel article' }));
		const add = screen.getByRole('button', { name: 'Ajouter à la liste' });
		expect(add).toBeDisabled();
		await fireEvent.input(field('Marque'), { target: { value: 'Puma' } });
		await fireEvent.input(field('Modèle'), { target: { value: 'Suede' } });
		await fireEvent.input(field('Taille'), { target: { value: '42' } });
		await fireEvent.input(field('Couleur'), { target: { value: 'Rouge' } });
		await fireEvent.input(field("Prix de l'article"), { target: { value: '30' } });
		await fireEvent.input(field('Frais de port'), { target: { value: '5' } });
		await fireEvent.click(add);
		expect(screen.getByText(/Puma\s+Suede/)).toBeInTheDocument();
		await fireEvent.input(field('Lieu de stockage'), { target: { value: 'Carton 1' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Récupérer 1 article' }));
		await waitFor(() => expect(remote.markParcelCollected).toHaveBeenCalledTimes(1));
		expect(remote.markParcelCollected.mock.calls[0][0]).toMatchObject({
			listingIds: [],
			stockingPlace: { value: 'Carton 1', uuid: null },
			newListings: [
				{
					brand: { value: 'Puma', uuid: null },
					model: { value: 'Suede', uuid: null },
					size: { value: '42', uuid: null },
					color: { value: 'Rouge', uuid: null },
					purchasePrice: 30,
					shippingPrice: 5
				}
			]
		});
	});

	it('affiche l’erreur serveur et garde la sélection', async () => {
		remote.markParcelCollected.mockRejectedValue(new Error('boom'));
		await openModal();
		await fireEvent.click(screen.getByRole('checkbox', { name: /Nike Air Max/ }));
		await fireEvent.input(field('Lieu de stockage'), { target: { value: 'Étagère A' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Récupérer 1 article' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Impossible d’enregistrer');
		expect(toast).not.toHaveBeenCalled();
		expect(screen.getByRole('checkbox', { name: /Nike Air Max/ })).toBeChecked();
		expect(screen.getByRole('button', { name: 'Récupérer 1 article' })).toBeEnabled();
	});

	it('bloque Échap pendant l’enregistrement', async () => {
		let release: (value: unknown) => void = () => {};
		remote.markParcelCollected.mockReturnValue(new Promise((resolve) => (release = resolve)));
		await openModal();
		await fireEvent.click(screen.getByRole('checkbox', { name: /Nike Air Max/ }));
		await fireEvent.input(field('Lieu de stockage'), { target: { value: 'Étagère A' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Récupérer 1 article' }));
		const dialogs = document.querySelectorAll('dialog');
		const cancel = new Event('cancel', { cancelable: true });
		dialogs.forEach((dialog) => dialog.dispatchEvent(cancel));
		expect(cancel.defaultPrevented).toBe(true);
		release({ collected: ['a1'], skipped: [], created: [] });
		await waitFor(() => expect(toast).toHaveBeenCalled());
	});
});

describe('Onglet Récupérés', () => {
	it('conserve l’ordre par date de récupération, sans tri par date limite', () => {
		remote.collected.current = [
			parcel('x', { pickupDeadline: '2099-12-31', collectedAt: new Date('2026-10-20') }),
			parcel('y', { pickupDeadline: '2000-01-01', collectedAt: new Date('2026-10-10') }),
			parcel('z', { pickupDeadline: null, collectedAt: new Date('2026-10-05') })
		];
		render(ParcelsView, { collected: true });
		expect(screen.queryByLabelText('Trier par')).toBeNull();
		const cards = screen.getAllByRole('button', { name: /Code-barres/ });
		expect(cards.map((c) => c.querySelector('img')?.getAttribute('src'))).toEqual([
			'/images/x.webp',
			'/images/y.webp',
			'/images/z.webp'
		]);
	});
});
