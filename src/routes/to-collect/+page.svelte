<script lang="ts">
	import ListingEditor from '$lib/components/listings/ListingEditor.svelte';
	import { resolve } from '$app/paths';
	import Autocomplete from '$lib/components/form/Autocomplete.svelte';
	import type { AutocompleteItem } from '$lib/components/form/Autocomplete.svelte.js';
	import { getToCollectListings, listCollectedItem } from '$lib/remote/listings.remote';
	import { searchStockingPlaces } from '$lib/remote/stocking-places.remote';

	const orders = getToCollectListings();
	let selectedId = $state<string | null>(null);
	let listingPrice = $state<number | undefined>();
	let stockingPlace = $state<AutocompleteItem>({ value: '', uuid: null });
	let saving = $state(false);
	let transitionKey = $state(0);
	let errorMessage = $state('');
	let dialog: HTMLDialogElement;
	const valid = $derived(
		listingPrice !== undefined &&
			Number.isFinite(listingPrice) &&
			listingPrice >= 0.01 &&
			stockingPlace.value.trim().length > 0
	);
	const euros = (cents: number) =>
		new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
	const placeQuery = (search: string, offset: number, limit: number) =>
		searchStockingPlaces({ search, offset, limit });

	function openTransition(id: string) {
		transitionKey += 1;
		selectedId = id;
		listingPrice = undefined;
		stockingPlace = { value: '', uuid: null };
		errorMessage = '';
		dialog.showModal();
	}

	async function confirm() {
		if (!valid || !selectedId || saving) return;
		saving = true;
		errorMessage = '';
		try {
			await listCollectedItem({
				listingId: selectedId,
				listingPrice: listingPrice!,
				stockingPlace
			});
			dialog.close();
		} catch {
			errorMessage = 'Impossible de valider cet article. Réessaie ou actualise la page.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-50 px-6 py-6">
	<div class="mb-6 flex items-center justify-between gap-4">
		<h1 class="text-xl font-semibold text-violet-950">À récupérer</h1>
		<a
			href={resolve('/to-collect/insert')}
			class="inline-flex items-center gap-2 rounded-lg bg-violet-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-900"
		>
			<span aria-hidden="true">+</span> Ajouter
		</a>
	</div>
	{#await orders}
		<p class="text-sm text-gray-500">Chargement des commandes…</p>
	{:then items}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
			{#each items as item (item.id)}
				<article class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
					<div class="relative flex aspect-square items-center justify-center bg-violet-50">
						<ListingEditor listingId={item.id} />
						{#if item.image}
							<img
								src={item.image}
								alt={`${item.brand} ${item.model}`}
								class="h-full w-full object-cover"
							/>
						{:else}
							<div class="px-6 text-center">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.4"
									class="mx-auto mb-4 h-14 w-14 text-violet-300"
									aria-hidden="true"
									><path d="m8 3-5 3-2 5 4 2 2-3v11h10V10l2 3 4-2-2-5-5-3a4 4 0 0 1-8 0Z" /></svg
								>
								<p class="font-medium text-violet-950">{item.brand}</p>
								<p class="mt-1 text-sm text-gray-500">{item.model}</p>
							</div>
						{/if}
						<button
							type="button"
							onclick={() => openTransition(item.id)}
							aria-label={`Valider la récupération de ${item.brand} ${item.model}`}
							class="absolute top-3 right-3 rounded-lg bg-violet-950 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-900"
							>✓ Valider</button
						>
					</div>
					<div class="px-4 py-3">
						<h2 class="font-medium text-gray-900">{item.brand} · {item.model}</h2>
						<p class="mt-1 text-sm text-gray-500">{item.size} · {item.color}</p>
					</div>
					<div
						class="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-3"
					>
						<div>
							<p class="text-xs text-gray-500">Prix acheté</p>
							<p class="font-semibold text-violet-950">{euros(item.purchasePrice)}</p>
						</div>
						<p class="text-xs text-gray-500">Port : {euros(item.shippingPrice)}</p>
					</div>
				</article>
			{:else}
				<p
					class="col-span-full rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500"
				>
					Aucune commande à récupérer.
				</p>
			{/each}
		</div>
	{:catch}
		<p role="alert" class="text-sm text-red-600">Impossible de charger les commandes.</p>
		<button
			type="button"
			onclick={() => orders.refresh()}
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
	<h2 class="text-lg font-semibold text-violet-950">Passer l’article en listé</h2>
	<p class="mt-1 text-sm text-gray-500">Indique le prix de mise en vente et le lieu de stockage.</p>
	<form
		class="mt-6 space-y-5"
		onsubmit={(event) => {
			event.preventDefault();
			confirm();
		}}
	>
		<div>
			<label for="listing-price" class="mb-2 block text-sm font-medium text-gray-700"
				>Prix de mise en vente (€)</label
			>
			<input
				id="listing-price"
				type="number"
				min="0.01"
				step="0.01"
				required
				bind:value={listingPrice}
				disabled={saving}
				placeholder="0,00"
				class="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
			/>
		</div>
		<div>
			<label for="stocking-place" class="mb-2 block text-sm font-medium text-gray-700"
				>Lieu de stockage</label
			>
			{#key transitionKey}
				<Autocomplete
					id="stocking-place"
					query={placeQuery}
					bind:model={stockingPlace}
					disabled={saving}
				/>
			{/key}
		</div>
		{#if errorMessage}<p role="alert" class="text-sm text-red-600">{errorMessage}</p>{/if}
		<div class="flex justify-end gap-3">
			<button
				type="button"
				disabled={saving}
				onclick={() => dialog.close()}
				class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 disabled:opacity-50"
				>Annuler</button
			>
			<button
				type="submit"
				disabled={!valid || saving}
				class="rounded-lg bg-violet-950 px-4 py-2 text-sm font-medium text-white hover:bg-violet-900 disabled:cursor-not-allowed disabled:opacity-40"
				>{saving ? 'Validation…' : 'Valider'}</button
			>
		</div>
	</form>
</dialog>
