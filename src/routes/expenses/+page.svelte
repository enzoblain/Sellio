<script lang="ts">
	import { euros } from '$lib/format';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Page from '$lib/components/ui/Page.svelte';
	import Autocomplete from '$lib/components/form/Autocomplete.svelte';
	import type { AutocompleteItem } from '$lib/components/form/Autocomplete.svelte.js';
	import { createExpense, getExpenses, searchExpenseCategories } from '$lib/remote/expenses.remote';

	const costs = getExpenses();
	let category = $state<AutocompleteItem>({ uuid: null, value: '' });
	let name = $state('');
	let price = $state<number | undefined>();
	let saving = $state(false);
	let errorMessage = $state('');
	let formKey = $state(0);
	let dialog = $state<HTMLDialogElement>();
	const valid = $derived(
		category.value.trim().length > 0 &&
			name.trim().length > 0 &&
			price !== undefined &&
			Number.isFinite(price) &&
			price >= 0.01
	);
	const formatDate = (value: string) =>
		new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
	const categoryQuery = (search: string, offset: number, limit: number) =>
		searchExpenseCategories({ search, offset, limit });

	function openForm() {
		formKey += 1;
		category = { uuid: null, value: '' };
		name = '';
		price = undefined;
		errorMessage = '';
		dialog?.showModal();
	}
	async function confirm() {
		if (!valid || saving) return;
		saving = true;
		errorMessage = '';
		try {
			await createExpense({ category, name, price: price! });
			dialog?.close();
		} catch {
			errorMessage = 'Impossible d’ajouter la dépense. Vérifie les champs et réessaie.';
		} finally {
			saving = false;
		}
	}
</script>

<Page title="Dépenses">
	{#snippet actions()}
		<Button onclick={openForm}><span aria-hidden="true">+</span> Ajouter</Button>
	{/snippet}
	{#await costs}
		<p class="text-sm text-fg-muted">Chargement des dépenses…</p>
	{:then items}
		<div class="space-y-3">
			{#each items as item (item.id)}
				<Card class="flex flex-wrap items-center justify-between gap-4">
					<div class="min-w-0 flex-1">
						<Badge tone="accent">{item.category}</Badge>
						<h2 class="mt-2 font-medium break-words text-fg">{item.name}</h2>
					</div>
					<div class="shrink-0 text-right">
						<p class="font-semibold text-fg">{euros(item.price)}</p>
						<p class="mt-1 text-xs text-fg-muted">
							{#if item.date}<time datetime={item.date}>{formatDate(item.date)}</time>{:else}Date
								non renseignée{/if}
						</p>
					</div>
				</Card>
			{:else}
				<EmptyState>Aucune dépense enregistrée.</EmptyState>
			{/each}
		</div>
	{:catch}
		<ErrorState message="Impossible de charger les dépenses." onretry={() => costs.refresh()} />
	{/await}
</Page>

<Dialog bind:element={dialog} dismissible={!saving} title="Ajouter une dépense">
	<form
		class="space-y-5"
		onsubmit={(event) => {
			event.preventDefault();
			confirm();
		}}
	>
		<Field label="Catégorie" id="expense-category">
			{#key formKey}<Autocomplete
					id="expense-category"
					query={categoryQuery}
					bind:model={category}
					disabled={saving}
				/>{/key}
		</Field>
		<Field label="Nom" id="expense-name">
			<Input
				id="expense-name"
				required
				bind:value={name}
				disabled={saving}
				placeholder="Ex. Cartons d’expédition"
			/>
		</Field>
		<Field label="Prix (€)" id="expense-price">
			<Input
				id="expense-price"
				type="number"
				min="0.01"
				step="0.01"
				required
				bind:value={price}
				disabled={saving}
				placeholder="0,00"
			/>
		</Field>
		{#if errorMessage}<p role="alert" class="text-sm text-danger">{errorMessage}</p>{/if}
		<div class="flex justify-end gap-3">
			<Button variant="secondary" disabled={saving} onclick={() => dialog?.close()}>Annuler</Button>
			<Button type="submit" disabled={!valid || saving}>{saving ? 'Ajout…' : 'Ajouter'}</Button>
		</div>
	</form>
</Dialog>
