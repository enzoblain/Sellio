import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import Badge from './Badge.svelte';
import Button from './Button.svelte';
import Dialog from './Dialog.svelte';
import Card from './Card.svelte';
import EmptyState from './EmptyState.svelte';
import ErrorState from './ErrorState.svelte';
import Field from './Field.svelte';
import Icon, { icons } from './Icon.svelte';
import Input from './Input.svelte';
import Select from './Select.svelte';
import Page from './Page.svelte';
import ThemeToggle from './ThemeToggle.svelte';

const text = (value: string) => createRawSnippet(() => ({ render: () => `<span>${value}</span>` }));

describe('ui', () => {
	it('Page affiche le titre et le contenu', () => {
		render(Page, { title: 'Dépenses', children: text('contenu') });
		expect(screen.getByRole('heading', { name: 'Dépenses' })).toBeInTheDocument();
		expect(screen.getByText('contenu')).toBeInTheDocument();
	});

	it('Card, Badge et EmptyState rendent leur contenu', () => {
		render(Card, { children: text('carte') });
		render(Badge, { tone: 'success', children: text('ok') });
		render(EmptyState, { children: text('rien') });
		expect(screen.getByText('carte')).toBeInTheDocument();
		expect(screen.getByText('ok').parentElement).toHaveClass('text-success');
		expect(screen.getByText('rien')).toBeInTheDocument();
	});

	it('Button déclenche onclick, sauf désactivé', async () => {
		const onclick = vi.fn();
		const { unmount } = render(Button, { onclick, children: text('Valider') });
		await fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
		expect(onclick).toHaveBeenCalledOnce();
		unmount();
		render(Button, { onclick, disabled: true, children: text('Non') });
		expect(screen.getByRole('button', { name: 'Non' })).toBeDisabled();
	});

	it('Button est de type button par défaut', () => {
		render(Button, { children: text('x') });
		expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
	});

	it('Input propage les attributs', () => {
		render(Input, { id: 'prix', placeholder: '0,00' });
		expect(screen.getByPlaceholderText('0,00')).toHaveAttribute('id', 'prix');
	});

	it('Field associe le label et affiche l’erreur', () => {
		render(Field, { label: 'Prix', id: 'prix', error: 'Obligatoire', children: text('') });
		expect(screen.getByText('Prix')).toHaveAttribute('for', 'prix');
		expect(screen.getByRole('alert')).toHaveTextContent('Obligatoire');
	});

	it('ErrorState propose Réessayer', async () => {
		const onretry = vi.fn();
		render(ErrorState, { message: 'Échec', onretry });
		expect(screen.getByRole('alert')).toHaveTextContent('Échec');
		await fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
		expect(onretry).toHaveBeenCalledOnce();
	});

	it('Icon rend un svg par nom', () => {
		for (const name of Object.keys(icons) as (keyof typeof icons)[]) {
			const { container, unmount } = render(Icon, { name });
			expect(container.querySelector(`svg[data-icon="${name}"]`)).not.toBeNull();
			unmount();
		}
	});

	it('ThemeToggle bascule .dark et mémorise le choix', async () => {
		localStorage.clear();
		document.documentElement.classList.remove('dark');
		window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
		render(ThemeToggle);
		await fireEvent.click(await screen.findByRole('button', { name: 'Passer au thème sombre' }));
		expect(document.documentElement).toHaveClass('dark');
		expect(localStorage.getItem('theme')).toBe('dark');
		await fireEvent.click(screen.getByRole('button', { name: 'Passer au thème clair' }));
		expect(document.documentElement).not.toHaveClass('dark');
		expect(localStorage.getItem('theme')).toBe('light');
	});

	it('Dialog associe son titre via aria-labelledby, avec un id unique par instance', () => {
		const a = render(Dialog, { title: 'Premier', children: text('a') });
		const b = render(Dialog, { title: 'Second', children: text('b') });
		const dialogs = document.querySelectorAll('dialog');
		const ids = [...dialogs].map((dialog) => dialog.getAttribute('aria-labelledby'));
		expect(new Set(ids).size).toBe(2);
		for (const dialog of dialogs) {
			const title = document.getElementById(dialog.getAttribute('aria-labelledby')!);
			expect(title).toHaveTextContent(dialog.querySelector('h2')!.textContent!);
		}
		a.unmount();
		b.unmount();
	});

	it('Dialog bloque cancel (Échap) quand dismissible est false', () => {
		render(Dialog, { title: 'Enregistrement', dismissible: false, children: text('x') });
		const dialog = document.querySelector('dialog')!;
		const cancel = new Event('cancel', { cancelable: true });
		dialog.dispatchEvent(cancel);
		expect(cancel.defaultPrevented).toBe(true);
	});

	it('Dialog laisse cancel passer par défaut', () => {
		render(Dialog, { title: 'Libre', children: text('x') });
		const cancel = new Event('cancel', { cancelable: true });
		document.querySelector('dialog')!.dispatchEvent(cancel);
		expect(cancel.defaultPrevented).toBe(false);
	});

	it('Field passe aria-describedby et aria-invalid à son contenu quand il y a une erreur', () => {
		const children = createRawSnippet<[{ 'aria-describedby'?: string; 'aria-invalid'?: true }]>(
			(aria) => ({
				render: () =>
					`<input id="prix" aria-describedby="${aria()['aria-describedby'] ?? ''}" aria-invalid="${aria()['aria-invalid'] ?? ''}" />`
			})
		);
		render(Field, { label: 'Prix', id: 'prix', error: 'Obligatoire', children });
		const input = screen.getByRole('textbox');
		expect(input).toHaveAttribute('aria-describedby', 'prix-error');
		expect(input).toHaveAttribute('aria-invalid', 'true');
		expect(document.getElementById('prix-error')).toHaveTextContent('Obligatoire');
	});

	it('Button danger et Select', () => {
		render(Button, { variant: 'danger', children: text('Supprimer') });
		expect(screen.getByRole('button', { name: 'Supprimer' })).toHaveClass('bg-danger');
		render(Select, { 'aria-label': 'Statut', children: text('') });
		expect(screen.getByRole('combobox', { name: 'Statut' })).toBeInTheDocument();
	});

	it('Page wide lève la limite de largeur', () => {
		const { container } = render(Page, { title: 'Stock', wide: true, children: text('x') });
		expect(container.firstElementChild).toHaveClass('max-w-none');
	});

	it('ThemeToggle reflète le thème déjà appliqué dès le montage', async () => {
		localStorage.setItem('theme', 'dark');
		window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
		render(ThemeToggle);
		expect(
			await screen.findByRole('button', { name: 'Passer au thème clair' })
		).toBeInTheDocument();
		localStorage.clear();
		document.documentElement.classList.remove('dark');
	});
});
