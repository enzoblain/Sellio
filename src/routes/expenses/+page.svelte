<script lang="ts">
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
	let dialog: HTMLDialogElement;
	const valid = $derived(
		category.value.trim().length > 0 &&
			name.trim().length > 0 &&
			price !== undefined &&
			Number.isFinite(price) &&
			price >= 0.01
	);
	const euros = (cents: number) =>
		new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
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
		dialog.showModal();
	}
	async function confirm() {
		if (!valid || saving) return;
		saving = true;
		errorMessage = '';
		try {
			await createExpense({ category, name, price: price! });
			dialog.close();
		} catch {
			errorMessage =
				'Impossible d’ajouter la dépense. Vérifie les champs ; si ce nom existe dans une autre catégorie, choisis un autre nom.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-50 px-6 py-6">
	<div class="mb-6 flex items-center justify-between gap-4">
		<h1 class="text-xl font-semibold text-violet-950">Dépenses</h1>
		<button
			type="button"
			onclick={openForm}
			class="inline-flex items-center gap-2 rounded-lg bg-violet-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-900"
			><span aria-hidden="true">+</span> Ajouter</button
		>
	</div>
	{#await costs}
		<p class="text-sm text-gray-500">Chargement des dépenses…</p>
	{:then items}
		<div class="space-y-3">
			{#each items as item (item.id)}
				<article
					class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm"
				>
					<div class="min-w-0 flex-1">
						<span
							class="inline-block rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-950"
							>{item.category}</span
						>
						<h2 class="mt-2 font-medium break-words text-gray-900">{item.name}</h2>
					</div>
					<div class="shrink-0 text-right">
						<p class="font-semibold text-violet-950">{euros(item.price)}</p>
						<p class="mt-1 text-xs text-gray-500">
							{#if item.date}<time datetime={item.date}>{formatDate(item.date)}</time>{:else}Date
								non renseignée{/if}
						</p>
					</div>
				</article>
			{:else}
				<p
					class="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500"
				>
					Aucune dépense enregistrée.
				</p>
			{/each}
		</div>
	{:catch}
		<p role="alert" class="text-sm text-red-600">Impossible de charger les dépenses.</p>
		<button
			type="button"
			onclick={() => costs.refresh()}
			class="mt-3 text-sm font-medium text-violet-950">Réessayer</button
		>
	{/await}
</div>

<dialog
	bind:this={dialog}
	oncancel={(event) => {
		if (saving) event.preventDefault();
	}}
	class="m-auto w-[calc(100%-2rem)] max-w-md overflow-visible rounded-xl bg-white p-6 shadow-xl backdrop:bg-violet-950/30"
>
	<h2 class="text-lg font-semibold text-violet-950">Ajouter une dépense</h2>
	<form
		class="mt-6 space-y-5"
		onsubmit={(event) => {
			event.preventDefault();
			confirm();
		}}
	>
		<div>
			<label for="expense-category" class="mb-2 block text-sm font-medium text-gray-700"
				>Catégorie</label
			>{#key formKey}<Autocomplete
					id="expense-category"
					query={categoryQuery}
					bind:model={category}
					disabled={saving}
				/>{/key}
		</div>
		<div>
			<label for="expense-name" class="mb-2 block text-sm font-medium text-gray-700">Nom</label
			><input
				id="expense-name"
				required
				bind:value={name}
				disabled={saving}
				placeholder="Ex. Cartons d’expédition"
				class="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
			/>
		</div>
		<div>
			<label for="expense-price" class="mb-2 block text-sm font-medium text-gray-700"
				>Prix (€)</label
			><input
				id="expense-price"
				type="number"
				min="0.01"
				step="0.01"
				required
				bind:value={price}
				disabled={saving}
				placeholder="0,00"
				class="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
			/>
		</div>
		{#if errorMessage}<p role="alert" class="text-sm text-red-600">{errorMessage}</p>{/if}
		<div class="flex justify-end gap-3">
			<button
				type="button"
				disabled={saving}
				onclick={() => dialog.close()}
				class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 disabled:opacity-50"
				>Annuler</button
			><button
				type="submit"
				disabled={!valid || saving}
				class="rounded-lg bg-violet-950 px-4 py-2 text-sm font-medium text-white hover:bg-violet-900 disabled:cursor-not-allowed disabled:opacity-40"
				>{saving ? 'Ajout…' : 'Ajouter'}</button
			>
		</div>
	</form>
</dialog>
