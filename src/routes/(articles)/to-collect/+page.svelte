<script lang="ts">
	import { euros } from '$lib/format';
	import ArticleList from '$lib/components/listings/ArticleList.svelte';
	import Stat from '$lib/components/listings/Stat.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import { toast } from '$lib/components/ui/toast.svelte';
	import Autocomplete from '$lib/components/form/Autocomplete.svelte';
	import type { AutocompleteItem } from '$lib/components/form/Autocomplete.svelte.js';
	import { collectItem } from '$lib/remote/listings.remote';
	import { searchStockingPlaces } from '$lib/remote/stocking-places.remote';

	let selected = $state<{ id: string; name: string } | null>(null);
	let stockingPlace = $state<AutocompleteItem>({ value: '', uuid: null });
	let saving = $state(false);
	let transitionKey = $state(0);
	let errorMessage = $state('');
	let dialog = $state<HTMLDialogElement>();
	const valid = $derived(stockingPlace.value.trim().length > 0);
	const placeQuery = (search: string, offset: number, limit: number) =>
		searchStockingPlaces({ search, offset, limit });

	function openTransition(item: { id: string; brand: string; model: string }) {
		transitionKey += 1;
		selected = { id: item.id, name: `${item.brand} ${item.model}` };
		stockingPlace = { value: '', uuid: null };
		errorMessage = '';
		dialog?.showModal();
	}

	async function confirm() {
		if (!valid || !selected || saving) return;
		saving = true;
		errorMessage = '';
		try {
			await collectItem({
				listingId: selected.id,
				stockingPlace
			});
			dialog?.close();
			toast(`${selected.name} récupéré, placé en stock.`);
		} catch {
			errorMessage = 'Impossible de valider cet article. Réessaie ou actualise la page.';
		} finally {
			saving = false;
		}
	}
</script>

<ArticleList emptyLabel="Aucune commande à récupérer.">
	{#snippet figures(item)}
		<Stat label="Prix acheté" value={euros(item.purchasePrice)} />
		<Stat label="Port" align="right" value={euros(item.shippingPrice)} />
	{/snippet}
	{#snippet action(item)}
		<Button
			onclick={() => openTransition(item)}
			aria-label={`Récupéré : ${item.brand} ${item.model}`}
			size="sm">Récupéré</Button
		>
	{/snippet}
</ArticleList>

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
