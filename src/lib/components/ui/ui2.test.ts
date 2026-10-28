import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Chip from './Chip.svelte';
import DataList from './DataList.svelte';
import Drawer from './Drawer.svelte';
import FilterBar from './FilterBar.svelte';
import SearchInput from './SearchInput.svelte';
import SegmentedControl from './SegmentedControl.svelte';
import Tabs from './Tabs.svelte';
import Toaster from './Toaster.svelte';
import { toast, toasts } from './toast.svelte';

const text = (value: string) => createRawSnippet(() => ({ render: () => `<span>${value}</span>` }));

afterEach(() => {
	vi.useRealTimers();
	toasts.items = [];
});

describe('Tabs', () => {
	const tabs = [
		{ id: 'a', label: 'Un' },
		{ id: 'b', label: 'Deux' },
		{ id: 'c', label: 'Trois' }
	];

	it('expose tablist/tab et roving tabindex', () => {
		render(Tabs, { tabs, label: 'Vues' });
		expect(screen.getByRole('tablist', { name: 'Vues' })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Un' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tab', { name: 'Un' })).toHaveAttribute('tabindex', '0');
		expect(screen.getByRole('tab', { name: 'Deux' })).toHaveAttribute('tabindex', '-1');
	});

	it('navigue aux flèches, Home et End, avec bouclage', async () => {
		render(Tabs, { tabs, label: 'Vues' });
		const list = screen.getByRole('tablist');
		await fireEvent.keyDown(list, { key: 'ArrowRight' });
		expect(screen.getByRole('tab', { name: 'Deux' })).toHaveAttribute('aria-selected', 'true');
		await fireEvent.keyDown(list, { key: 'End' });
		expect(screen.getByRole('tab', { name: 'Trois' })).toHaveAttribute('aria-selected', 'true');
		await fireEvent.keyDown(list, { key: 'ArrowRight' });
		expect(screen.getByRole('tab', { name: 'Un' })).toHaveAttribute('aria-selected', 'true');
		await fireEvent.keyDown(list, { key: 'ArrowLeft' });
		expect(screen.getByRole('tab', { name: 'Trois' })).toHaveAttribute('aria-selected', 'true');
	});

	it('un clic sélectionne l’onglet', async () => {
		render(Tabs, { tabs, label: 'Vues' });
		await fireEvent.click(screen.getByRole('tab', { name: 'Deux' }));
		expect(screen.getByRole('tab', { name: 'Deux' })).toHaveAttribute('aria-selected', 'true');
	});
});

describe('Drawer', () => {
	it('s’ouvre, se ferme et appelle onclose', async () => {
		const showModal = vi.fn(function (this: HTMLDialogElement) {
			this.setAttribute('open', '');
		});
		const close = vi.fn(function (this: HTMLDialogElement) {
			this.removeAttribute('open');
			this.dispatchEvent(new Event('close'));
		});
		HTMLDialogElement.prototype.showModal = showModal;
		HTMLDialogElement.prototype.close = close;
		const onclose = vi.fn();
		render(Drawer, { open: true, title: 'Filtres', onclose, children: text('contenu') });
		expect(showModal).toHaveBeenCalledOnce();
		const dialog = document.querySelector('dialog')!;
		expect(dialog).toHaveAttribute('aria-labelledby');
		expect(dialog).toHaveClass('h-dvh');
		await fireEvent.click(screen.getByRole('button', { name: 'Fermer', hidden: true }));
		expect(close).toHaveBeenCalledOnce();
		expect(onclose).toHaveBeenCalledOnce();
	});
});

describe('SearchInput', () => {
	it('est un champ de recherche nommé, avec bouton d’effacement', async () => {
		render(SearchInput, { 'aria-label': 'Rechercher', value: 'robe' });
		const input = screen.getByRole('searchbox', { name: 'Rechercher' });
		expect(input).toHaveValue('robe');
		await fireEvent.click(screen.getByRole('button', { name: 'Effacer la recherche' }));
		expect(input).toHaveValue('');
		expect(screen.queryByRole('button', { name: 'Effacer la recherche' })).toBeNull();
	});

	it('Échap efface', async () => {
		render(SearchInput, { 'aria-label': 'Rechercher', value: 'x' });
		const input = screen.getByRole('searchbox');
		await fireEvent.keyDown(input, { key: 'Escape' });
		expect(input).toHaveValue('');
	});
});

describe('Chip et FilterBar', () => {
	it('Chip expose aria-pressed', () => {
		render(Chip, { selected: true, children: text('Nike') });
		expect(screen.getByRole('button', { name: 'Nike' })).toHaveAttribute('aria-pressed', 'true');
	});

	it('Chip removable : croix, sans aria-pressed', () => {
		render(Chip, { removable: true, children: text('Nike') });
		const chip = screen.getByRole('button', { name: 'Nike' });
		expect(chip).not.toHaveAttribute('aria-pressed');
		expect(chip.querySelector('svg')).not.toBeNull();
	});

	it('FilterBar bascule les sélections', async () => {
		render(FilterBar, {
			label: 'Marques',
			options: [
				{ value: 'n', label: 'Nike' },
				{ value: 'a', label: 'Adidas' }
			]
		});
		expect(screen.getByRole('group', { name: 'Marques' })).toBeInTheDocument();
		const nike = screen.getByRole('button', { name: 'Nike' });
		await fireEvent.click(nike);
		expect(nike).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByRole('button', { name: 'Adidas' })).toHaveAttribute('aria-pressed', 'false');
		await fireEvent.click(nike);
		expect(nike).toHaveAttribute('aria-pressed', 'false');
	});
});

describe('SegmentedControl', () => {
	it('est un radiogroup dont la sélection suit le clic', async () => {
		render(SegmentedControl, {
			label: 'Période',
			options: [
				{ value: 'm', label: 'Mois' },
				{ value: 'y', label: 'Année' }
			]
		});
		expect(screen.getByRole('radiogroup', { name: 'Période' })).toBeInTheDocument();
		expect(screen.getByRole('radio', { name: 'Mois' })).toBeChecked();
		await fireEvent.click(screen.getByRole('radio', { name: 'Année' }));
		expect(screen.getByRole('radio', { name: 'Année' })).toBeChecked();
		expect(screen.getByRole('radio', { name: 'Mois' })).not.toBeChecked();
	});
});

describe('DataList', () => {
	const row = createRawSnippet<[{ n: string }]>((item) => ({
		render: () => `<span>${item().n}</span>`
	}));

	it('rend une liste étiquetée', () => {
		render(DataList<{ n: string }>, {
			label: 'Dépenses',
			items: [{ n: 'a' }, { n: 'b' }],
			key: (item) => item.n,
			row
		});
		expect(screen.getByRole('list', { name: 'Dépenses' })).toBeInTheDocument();
		expect(screen.getAllByRole('listitem')).toHaveLength(2);
	});

	it('affiche l’état vide', () => {
		render(DataList<{ n: string }>, {
			label: 'Dépenses',
			items: [],
			key: (item) => item.n,
			row,
			empty: text('Aucune dépense')
		});
		expect(screen.getByText('Aucune dépense')).toBeInTheDocument();
		expect(screen.queryByRole('list')).toBeNull();
	});
});

describe('Toast', () => {
	it('s’annonce dans une région status puis disparaît', async () => {
		vi.useFakeTimers();
		render(Toaster);
		toast('Article ajouté');
		await vi.advanceTimersByTimeAsync(0);
		expect(screen.getByRole('status')).toHaveTextContent('Article ajouté');
		await vi.advanceTimersByTimeAsync(4100);
		expect(screen.getByRole('status')).not.toHaveTextContent('Article ajouté');
	});

	it('se ferme à la main', async () => {
		render(Toaster);
		toast('Transition faite', 'success', 0);
		await fireEvent.click(await screen.findByRole('button', { name: 'Fermer la notification' }));
		expect(screen.getByRole('status')).not.toHaveTextContent('Transition faite');
	});
});

describe('Tabs en mode href', () => {
	const tabs = [
		{ id: 'a', label: 'Un', href: '/un' },
		{ id: 'b', label: 'Deux', href: '/deux' }
	];

	it('rend des liens avec aria-current sur l’onglet actif', () => {
		render(Tabs, { tabs, label: 'Vues', value: 'b' });
		expect(screen.getByRole('navigation', { name: 'Vues' })).toBeInTheDocument();
		expect(screen.queryByRole('tab')).toBeNull();
		expect(screen.getByRole('link', { name: 'Un' })).toHaveAttribute('href', '/un');
		expect(screen.getByRole('link', { name: 'Un' })).not.toHaveAttribute('aria-current');
		expect(screen.getByRole('link', { name: 'Deux' })).toHaveAttribute('aria-current', 'page');
	});
});
