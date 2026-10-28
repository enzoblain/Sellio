<script lang="ts">
	import { euros } from '$lib/format';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import { toast } from '$lib/components/ui/toast.svelte';
	import { expenseCategories, filterExpenses, totalExpenses } from '$lib/expenses';
	import Page from '$lib/components/ui/Page.svelte';
	import Autocomplete from '$lib/components/form/Autocomplete.svelte';
	import type { AutocompleteItem } from '$lib/components/form/Autocomplete.svelte.js';
	import { createExpense, getExpenses, searchExpenseCategories } from '$lib/remote/expenses.remote';

	const costs = getExpenses();
	let category = $state<AutocompleteItem>({ uuid: null, value: '' });
	let name = $state('');
	let price = $state<number | undefined>();
	let search = $state('');
	let selectedCategories = $state<string[]>([]);
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
			toast('Dépense ajoutée');
		} catch {
			errorMessage = 'Impossible d’ajouter la dépense. Vérifie les champs et réessaie.';
		} finally {
			saving = false;
		}
	}
</script>

<Page title="Dépenses">
	{#await costs}
		<p class="text-sm text-fg-muted">Chargement des dépenses…</p>
	{:then items}
		{@const visible = filterExpenses(items, search, selectedCategories)}
		<div class="sticky top-0 z-10 -mx-6 mb-4 space-y-3 bg-bg px-6 py-3 md:-mx-10 md:px-10">
			<div class="flex items-center gap-3">
				<SearchInput
					class="min-w-0 flex-1"
					aria-label="Rechercher une dépense"
					placeholder="Rechercher…"
					bind:value={search}
				/>
				<Button onclick={openForm} class="shrink-0"
					><span aria-hidden="true">+</span> Ajouter</Button
				>
			</div>
			{#if items.length > 0}
				<FilterBar
					label="Filtrer par catégorie"
					options={expenseCategories(items).map((value) => ({ value, label: value }))}
					bind:selected={selectedCategories}
				/>
				<p class="text-sm text-fg-muted" aria-live="polite">
					{visible.length}
					{visible.length > 1 ? 'dépenses' : 'dépense'} · Total :
					<strong class="font-semibold text-fg tabular-nums" data-testid="expenses-total"
						>{euros(totalExpenses(visible))}</strong
					>
				</p>
			{/if}
		</div>
		{#if visible.length === 0}
			<EmptyState
				>{items.length === 0
					? 'Aucune dépense enregistrée.'
					: 'Aucune dépense ne correspond à la recherche.'}</EmptyState
			>
		{:else}
			<div class="overflow-x-auto rounded-lg border border-border bg-surface">
				<table class="w-full text-sm">
					<thead class="bg-surface-2 text-left text-xs text-fg-muted">
						<tr>
							<th scope="col" class="px-3 py-2 font-medium">Date</th>
							<th scope="col" class="px-3 py-2 font-medium">Catégorie</th>
							<th scope="col" class="px-3 py-2 font-medium">Nom</th>
							<th scope="col" class="px-3 py-2 text-right font-medium">Montant</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each visible as item (item.id)}
							<tr>
								<td class="px-3 py-2 whitespace-nowrap text-fg-muted tabular-nums">
									{#if item.date}<time datetime={item.date}>{formatDate(item.date)}</time
										>{:else}—{/if}
								</td>
								<td class="px-3 py-2"><Badge tone="accent">{item.category}</Badge></td>
								<td class="px-3 py-2 break-words text-fg">{item.name}</td>
								<td class="px-3 py-2 text-right font-medium whitespace-nowrap text-fg tabular-nums"
									>{euros(item.price)}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
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
