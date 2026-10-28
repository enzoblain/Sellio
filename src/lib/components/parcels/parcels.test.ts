import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from '$lib/components/ui/toast.svelte';
import type { Parcel } from '$lib/parcels';

const remote = vi.hoisted(() => ({
	toCollect: { current: undefined as unknown[] | undefined, error: undefined, refresh: vi.fn() },
	collected: { current: [] as unknown[], error: undefined, refresh: vi.fn() },
	removeParcel: vi.fn()
}));
vi.mock('$lib/remote/parcels.remote', () => ({
	getParcelsToCollect: () => remote.toCollect,
	getCollectedParcels: () => remote.collected,
	getCarriers: () =>
		Promise.resolve([
			{ id: 1, name: 'Colissimo' },
			{ id: 2, name: 'Mondial Relay' }
		]),
	removeParcel: remote.removeParcel
}));
vi.mock('$lib/components/ui/toast.svelte', () => ({ toast: vi.fn() }));

import ParcelForm from './ParcelForm.svelte';
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

beforeEach(() => {
	HTMLDialogElement.prototype.showModal = function () {
		this.setAttribute('open', '');
	};
	HTMLDialogElement.prototype.close = function () {
		this.removeAttribute('open');
		this.dispatchEvent(new Event('close'));
	};
	vi.mocked(toast).mockReset();
	remote.removeParcel.mockReset();
	URL.createObjectURL = vi.fn(() => 'blob:x');
	URL.revokeObjectURL = vi.fn();
	remote.toCollect.current = [
		parcel('1', { pickupDeadline: '2099-12-31', pickupPoint: 'Tabac du coin' }),
		parcel('2', { carrierId: 2, carrier: 'Mondial Relay', pickupDeadline: '2099-01-01' }),
		parcel('3', { pickupDeadline: '2000-01-01', trackingCode: 'AB12' })
	];
});

describe('ParcelsView', () => {
	it('liste les colis triés par date limite avec alerte sur les dépassés', () => {
		render(ParcelsView);
		const cards = screen.getAllByRole('button', { name: /Code-barres/ });
		expect(cards.map((c) => within(c).getByRole('img').getAttribute('src'))).toEqual([
			'/images/3.webp',
			'/images/2.webp',
			'/images/1.webp'
		]);
		expect(within(cards[0]).getByText('Date limite dépassée')).toBeInTheDocument();
		expect(within(cards[2]).getByText('Tabac du coin')).toBeInTheDocument();
	});

	it('filtre par transporteur et change le tri', async () => {
		render(ParcelsView);
		await fireEvent.change(screen.getByLabelText('Filtrer par transporteur'), {
			target: { value: '2' }
		});
		expect(screen.getAllByRole('button', { name: /Code-barres/ })).toHaveLength(1);
		await fireEvent.change(screen.getByLabelText('Filtrer par transporteur'), {
			target: { value: '' }
		});
		await fireEvent.change(screen.getByLabelText('Trier par'), { target: { value: 'recent' } });
		expect(screen.getAllByRole('button', { name: /Code-barres/ })).toHaveLength(3);
	});

	it('affiche l’état vide', () => {
		remote.toCollect.current = [];
		render(ParcelsView);
		expect(screen.getByText('Aucun colis à récupérer.')).toBeInTheDocument();
	});

	it('ouvre le code-barres en grand sur fond clair', async () => {
		render(ParcelsView);
		await fireEvent.click(screen.getAllByRole('button', { name: /Code-barres/ })[0]);
		const big = await screen.findByRole('img', { name: /Code-barres 1 du colis Colissimo/ });
		expect(big).toHaveClass('bg-scan', 'w-full');
		expect(big.getAttribute('src')).toBe('/images/3.webp');
		expect(screen.getByText('AB12')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Récupéré' })).toBeInTheDocument();
	});

	it('supprime après confirmation', async () => {
		remote.removeParcel.mockResolvedValue(undefined);
		render(ParcelsView);
		await fireEvent.click(screen.getAllByRole('button', { name: /Code-barres/ })[0]);
		await fireEvent.click(await screen.findByRole('button', { name: 'Supprimer' }));
		expect(remote.removeParcel).not.toHaveBeenCalled();
		const confirm = screen.getAllByRole('button', { name: 'Supprimer' }).at(-1)!;
		await fireEvent.click(confirm);
		await waitFor(() => expect(remote.removeParcel).toHaveBeenCalledWith('3'));
		await waitFor(() => expect(toast).toHaveBeenCalledWith('Colis supprimé'));
	});
});

describe('ParcelForm', () => {
	const file = () => new File(['x'], 'code.jpg', { type: 'image/jpeg' });
	const setup = (onsubmit = vi.fn()) => {
		render(ParcelForm, {
			carriers: [
				{ id: 1, name: 'Colissimo' },
				{ id: 2, name: 'Mondial Relay' }
			],
			onsubmit,
			oncancel: vi.fn()
		});
		return onsubmit;
	};

	it('exige photo et transporteur, avec capture caméra', async () => {
		const onsubmit = setup();
		const save = screen.getByRole('button', { name: 'Enregistrer' });
		expect(save).toBeDisabled();
		const camera = screen.getByLabelText('Prendre une photo');
		expect(camera).toHaveAttribute('capture', 'environment');
		await fireEvent.change(camera, { target: { files: [file()] } });
		expect(save).toBeDisabled();
		await fireEvent.change(screen.getByLabelText('Transporteur'), { target: { value: '2' } });
		expect(save).toBeEnabled();
		await fireEvent.click(save);
		const form = onsubmit.mock.calls[0][0] as FormData;
		expect(form.get('carrierId')).toBe('2');
		expect(form.getAll('photos')).toHaveLength(1);
	});

	it('accepte plusieurs photos et permet de les retirer', async () => {
		setup();
		await fireEvent.change(screen.getByLabelText('Prendre une photo'), {
			target: { files: [file()] }
		});
		await fireEvent.change(screen.getByLabelText('Ajouter une photo'), {
			target: { files: [file()] }
		});
		expect(screen.getAllByRole('img')).toHaveLength(2);
		await fireEvent.click(screen.getByRole('button', { name: 'Retirer la photo 1' }));
		expect(screen.getAllByRole('img')).toHaveLength(1);
	});

	it('refuse un format invalide', async () => {
		setup();
		await fireEvent.change(screen.getByLabelText('Prendre une photo'), {
			target: { files: [new File(['x'], 'a.gif', { type: 'image/gif' })] }
		});
		expect(screen.getByRole('alert')).toHaveTextContent('Format refusé');
		expect(screen.queryAllByRole('img')).toHaveLength(0);
	});
});
