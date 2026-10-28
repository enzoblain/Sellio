import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const remote = vi.hoisted(() => ({
	getEditableListing: vi.fn(),
	deleteListing: vi.fn()
}));
vi.mock('$lib/remote/listing-editor.remote', () => remote);
vi.mock('./ListingEditor.svelte', async () => ({
	default: (await import('./ListingEditorStub.svelte')).default
}));
vi.mock('$lib/components/images/ListingGallery.svelte', () => ({ default: () => {} }));

import ArticleDetail from './ArticleDetail.svelte';
import { toasts } from '$lib/components/ui/toast.svelte';

const item = {
	id: 'a1',
	modelId: 'm',
	sizeId: 's',
	colorId: 'c',
	brand: 'Nike',
	model: 'Air',
	size: 'M',
	color: 'Noir',
	purchasePrice: 1000,
	shippingPrice: 500,
	listingPrice: 4000,
	salePrice: 4500,
	reference: 'AB12',
	stockingPlace: 'Cave'
};
const action = createRawSnippet(() => ({ render: () => '<button type="button">Expédié</button>' }));

beforeEach(() => {
	HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
		this.setAttribute('open', '');
	};
	HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
		this.removeAttribute('open');
		this.dispatchEvent(new Event('close'));
	};
	remote.getEditableListing.mockReset();
	remote.deleteListing.mockReset();
	remote.getEditableListing.mockReturnValue({
		refresh: () => Promise.resolve({ version: 'v1' }),
		then: undefined
	});
});

describe('ArticleDetail', () => {
	it('affiche infos, montants, référence et action de l’étape', () => {
		render(ArticleDetail, { item, onclose: vi.fn(), action });
		expect(screen.getByRole('heading', { name: 'Nike · Air' })).toBeInTheDocument();
		expect(screen.getByText('M · Noir')).toBeInTheDocument();
		expect(screen.getByText('Stockage : Cave')).toBeInTheDocument();
		expect(screen.getByText('Réf. AB12')).toBeInTheDocument();
		expect(screen.getByText('Achat total').nextElementSibling).toHaveTextContent('15,00');
		expect(screen.getByText('Bénéfice').nextElementSibling).toHaveTextContent('30,00');
		expect(screen.getByText('Multiplicateur').nextElementSibling).toHaveTextContent('×3');
		expect(screen.getByRole('button', { name: 'Expédié', hidden: true })).toBeInTheDocument();
	});

	it('affiche « — » sans prix vendu et reste fermé sans article', () => {
		const { unmount } = render(ArticleDetail, {
			item: { ...item, salePrice: null },
			onclose: vi.fn()
		});
		expect(screen.getByText('Bénéfice').nextElementSibling).toHaveTextContent('—');
		expect(screen.getByText('Multiplicateur').nextElementSibling).toHaveTextContent('—');
		unmount();
		render(ArticleDetail, { item: undefined, onclose: vi.fn() });
		expect(document.querySelector('dialog')).not.toHaveAttribute('open');
	});

	it('« Modifier » passe en formulaire, Annuler revient au détail', async () => {
		render(ArticleDetail, { item, onclose: vi.fn() });
		await fireEvent.click(screen.getByRole('button', { name: 'Modifier', hidden: true }));
		expect(screen.getByRole('heading', { name: 'Modifier l’article' })).toBeInTheDocument();
		expect(screen.getByTestId('editor-stub')).toHaveTextContent('a1');
		await fireEvent.click(screen.getByRole('button', { name: 'Annuler l’édition', hidden: true }));
		expect(screen.getByRole('heading', { name: 'Nike · Air' })).toBeInTheDocument();
	});

	it('un enregistrement réussi revient au détail et affiche un toast', async () => {
		toasts.items = [];
		render(ArticleDetail, { item, onclose: vi.fn() });
		await fireEvent.click(screen.getByRole('button', { name: 'Modifier', hidden: true }));
		await fireEvent.click(screen.getByRole('button', { name: 'Enregistré', hidden: true }));
		expect(screen.getByRole('heading', { name: 'Nike · Air' })).toBeInTheDocument();
		expect(toasts.items.map((t) => t.message)).toEqual(['Article modifié']);
	});

	it('pendant l’enregistrement, Échap et la croix sont bloqués', async () => {
		render(ArticleDetail, { item, onclose: vi.fn() });
		await fireEvent.click(screen.getByRole('button', { name: 'Modifier', hidden: true }));
		await fireEvent.click(screen.getByRole('button', { name: 'Enregistrement', hidden: true }));
		const dialog = document.querySelector('dialog')!;
		const cancel = new Event('cancel', { cancelable: true });
		dialog.dispatchEvent(cancel);
		expect(cancel.defaultPrevented).toBe(true);
		expect(screen.getByRole('button', { name: 'Fermer', hidden: true })).toBeDisabled();
	});

	it('suppression : confirmation, version envoyée, puis fermeture', async () => {
		remote.deleteListing.mockResolvedValue({ ok: true, paths: [] });
		const onclose = vi.fn();
		render(ArticleDetail, { item, onclose });
		await fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer', hidden: true })[0]);
		const confirm = await screen.findByText('Supprimer Nike · Air ?', { exact: false });
		expect(confirm).toBeInTheDocument();
		expect(remote.deleteListing).not.toHaveBeenCalled();
		const buttons = screen.getAllByRole('button', { name: 'Supprimer', hidden: true });
		const final = buttons[buttons.length - 1];
		await waitFor(() => expect(final).not.toBeDisabled());
		await fireEvent.click(final);
		await waitFor(() =>
			expect(remote.deleteListing).toHaveBeenCalledWith({ listingId: 'a1', version: 'v1' })
		);
		await waitFor(() => expect(onclose).toHaveBeenCalled());
	});

	it('suppression refusée (version périmée) : message, panneau conservé', async () => {
		remote.deleteListing.mockResolvedValue({ ok: false, error: 'L’article a changé.' });
		const onclose = vi.fn();
		render(ArticleDetail, { item, onclose });
		await fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer', hidden: true })[0]);
		const buttons = screen.getAllByRole('button', { name: 'Supprimer', hidden: true });
		const final = buttons[buttons.length - 1];
		await waitFor(() => expect(final).not.toBeDisabled());
		await fireEvent.click(final);
		expect(await screen.findByRole('alert', { hidden: true })).toHaveTextContent(
			'L’article a changé.'
		);
		expect(onclose).not.toHaveBeenCalled();
	});
});
