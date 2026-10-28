<script lang="ts">
	import { euros } from '$lib/format';
	import ListingStacks from '$lib/components/listings/ListingStacks.svelte';
	import ListingCard from '$lib/components/listings/ListingCard.svelte';
	import Stat from '$lib/components/listings/Stat.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Page from '$lib/components/ui/Page.svelte';
	import { resolve } from '$app/paths';
	import Autocomplete from '$lib/components/form/Autocomplete.svelte';
	import type { AutocompleteItem } from '$lib/components/form/Autocomplete.svelte.js';
	import { getToCollectListings, collectItem } from '$lib/remote/listings.remote';
	import { searchStockingPlaces } from '$lib/remote/stocking-places.remote';

	const orders = getToCollectListings();
	let selectedId = $state<string | null>(null);
	let stockingPlace = $state<AutocompleteItem>({ value: '', uuid: null });
	let saving = $state(false);
	let transitionKey = $state(0);
	let errorMessage = $state('');
	let dialog = $state<HTMLDialogElement>();
	const valid = $derived(stockingPlace.value.trim().length > 0);
	const placeQuery = (search: string, offset: number, limit: number) =>
		searchStockingPlaces({ search, offset, limit });

	function openTransition(id: string) {
		transitionKey += 1;
		selectedId = id;
		stockingPlace = { value: '', uuid: null };
		errorMessage = '';
		dialog?.showModal();
	}

	async function confirm() {
		if (!valid || !selectedId || saving) return;
		saving = true;
		errorMessage = '';
		try {
			await collectItem({
				listingId: selectedId,
				stockingPlace
			});
			dialog?.close();
		} catch {
			errorMessage = 'Impossible de valider cet article. Réessaie ou actualise la page.';
		} finally {
			saving = false;
		}
	}
</script>

<Page title="À récupérer" wide>
	{#snippet actions()}
		<a
			href={resolve('/to-collect/insert')}
			class="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
		>
			<span aria-hidden="true">+</span> Ajouter
		</a>
	{/snippet}
	{#await orders}
		<p class="text-sm text-fg-muted">Chargement des commandes…</p>
	{:then items}
		<ListingStacks {items}>
			{#snippet card(item, stackButton)}
				<ListingCard {item} {stackButton}>
					{#snippet action()}
						<Button
							onclick={() => openTransition(item.id)}
							aria-label={`Valider la récupération de ${item.brand} ${item.model}`}
							size="sm"
							class="shadow-sm">✓ Valider</Button
						>
					{/snippet}
					<h2 class="font-medium text-fg">{item.brand} · {item.model}</h2>
					<p class="mt-1 text-sm text-fg-muted">{item.size} · {item.color}</p>
					{#snippet footer()}
						<Stat label="Prix acheté" value={euros(item.purchasePrice)} />
						<p class="text-xs text-fg-muted">Port : {euros(item.shippingPrice)}</p>
					{/snippet}
				</ListingCard>
			{/snippet}
			{#snippet empty()}
				<EmptyState>Aucune commande à récupérer.</EmptyState>
			{/snippet}
		</ListingStacks>
	{:catch}
		<ErrorState message="Impossible de charger les commandes." onretry={() => orders.refresh()} />
	{/await}
</Page>

<Dialog
	bind:element={dialog}
	dismissible={!saving}
	title="Récupérer l’article"
	description="Indique le lieu de stockage pour placer l’article en stock."
>
	<form
		class="space-y-5"
		onsubmit={(event) => {
			event.preventDefault();
			confirm();
		}}
	>
		<Field label="Lieu de stockage" id="stocking-place">
			{#key transitionKey}
				<Autocomplete
					id="stocking-place"
					query={placeQuery}
					bind:model={stockingPlace}
					disabled={saving}
				/>
			{/key}
		</Field>
		{#if errorMessage}<p role="alert" class="text-sm text-danger">{errorMessage}</p>{/if}
		<div class="flex justify-end gap-3">
			<Button variant="secondary" disabled={saving} onclick={() => dialog?.close()}>Annuler</Button>
			<Button type="submit" disabled={!valid || saving}>{saving ? 'Validation…' : 'Valider'}</Button
			>
		</div>
	</form>
</Dialog>
