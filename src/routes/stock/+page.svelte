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
	import Input from '$lib/components/ui/Input.svelte';
	import Page from '$lib/components/ui/Page.svelte';
	import { getStockListings } from '$lib/remote/listings.remote';
	import { listStockItem } from '$lib/remote/listings.remote';

	const orders = getStockListings();
	let selectedId = $state<string | null>(null);
	let salePrice = $state<number | undefined>();
	let saving = $state(false);
	let errorMessage = $state('');
	let dialog = $state<HTMLDialogElement>();
	const valid = $derived(
		salePrice !== undefined && Number.isFinite(salePrice) && salePrice >= 0.01
	);

	function openTransition(id: string) {
		selectedId = id;
		salePrice = undefined;
		errorMessage = '';
		dialog?.showModal();
	}

	async function confirm() {
		if (!valid || !selectedId || saving) return;
		saving = true;
		errorMessage = '';
		try {
			await listStockItem({ listingId: selectedId, listingPrice: salePrice! });
			dialog?.close();
		} catch {
			errorMessage = 'Impossible de valider cet article. Réessaie ou actualise la page.';
		} finally {
			saving = false;
		}
	}
</script>

<Page title="Stock" wide>
	{#await orders}
		<p class="text-sm text-fg-muted">Chargement des commandes…</p>
	{:then items}
		<ListingStacks {items}>
			{#snippet card(item, stackButton)}
				<ListingCard {item} {stackButton}>
					{#snippet action()}
						<Button
							onclick={() => openTransition(item.id)}
							aria-label={`Mettre en vente ${item.brand} ${item.model}`}
							class="px-3 shadow-sm">✓ Valider</Button
						>
					{/snippet}
					<h2 class="font-medium text-fg">{item.brand} · {item.model}</h2>
					<p class="mt-1 text-sm text-fg-muted">{item.size} · {item.color}</p>
					<p class="mt-2 text-sm text-fg">Stockage : {item.stockingPlace ?? 'Non renseigné'}</p>
					{#snippet footer()}
						<Stat label="Achat total" value={euros(item.purchasePrice + item.shippingPrice)} />
					{/snippet}
				</ListingCard>
			{/snippet}
			{#snippet empty()}
				<EmptyState>Aucun article en stock.</EmptyState>
			{/snippet}
		</ListingStacks>
	{:catch}
		<ErrorState message="Impossible de charger les commandes." onretry={() => orders.refresh()} />
	{/await}
</Page>

<Dialog
	bind:element={dialog}
	dismissible={!saving}
	title="Mettre l’article en vente"
	description="Indique le prix auquel tu mets l’article en vente."
>
	<form
		class="space-y-5"
		onsubmit={(event) => {
			event.preventDefault();
			confirm();
		}}
	>
		<Field label="Prix de mise en vente (€)" id="listing-price">
			<Input
				id="listing-price"
				type="number"
				min="0.01"
				step="0.01"
				required
				bind:value={salePrice}
				disabled={saving}
				placeholder="0,00"
			/>
		</Field>
		{#if errorMessage}<p role="alert" class="text-sm text-danger">{errorMessage}</p>{/if}
		<div class="flex justify-end gap-3">
			<Button variant="secondary" disabled={saving} onclick={() => dialog?.close()}>Annuler</Button>
			<Button type="submit" disabled={!valid || saving}>{saving ? 'Validation…' : 'Valider'}</Button
			>
		</div>
	</form>
</Dialog>
