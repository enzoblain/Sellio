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
	import { getListedListings } from '$lib/remote/listings.remote';
	import { sellListing } from '$lib/remote/sales.remote';

	const orders = getListedListings();
	let selectedId = $state<string | null>(null);
	let salePrice = $state<number | undefined>();
	let generatedCode = $state('');
	let saving = $state(false);
	let errorMessage = $state('');
	let dialog = $state<HTMLDialogElement>();
	const valid = $derived(
		salePrice !== undefined && Number.isFinite(salePrice) && salePrice >= 0.01
	);

	function openTransition(id: string) {
		selectedId = id;
		salePrice = undefined;
		generatedCode = '';
		errorMessage = '';
		dialog?.showModal();
	}

	async function confirm() {
		if (!valid || !selectedId || saving) return;
		saving = true;
		errorMessage = '';
		try {
			const result = await sellListing({ listingId: selectedId, salePrice: salePrice! });
			generatedCode = result.code;
		} catch {
			errorMessage = 'Impossible de valider cet article. Réessaie ou actualise la page.';
		} finally {
			saving = false;
		}
	}
</script>

<Page title="En vente" wide>
	{#await orders}
		<p class="text-sm text-fg-muted">Chargement des commandes…</p>
	{:then items}
		<ListingStacks {items}>
			{#snippet card(item, stackButton)}
				<ListingCard {item} {stackButton}>
					{#snippet action()}
						<Button
							onclick={() => openTransition(item.id)}
							aria-label={`Enregistrer la vente de ${item.brand} ${item.model}`}
							size="sm"
							class="shadow-sm">✓ Valider</Button
						>
					{/snippet}
					<h2 class="font-medium text-fg">{item.brand} · {item.model}</h2>
					<p class="mt-1 text-sm text-fg-muted">{item.size} · {item.color}</p>
					<p class="mt-2 text-sm text-fg">Stockage : {item.stockingPlace ?? 'Non renseigné'}</p>
					{#snippet footer()}
						<Stat label="Achat total" value={euros(item.purchasePrice + item.shippingPrice)} />
						<Stat
							label="Prix de vente"
							align="right"
							value={item.listingPrice === null ? '—' : euros(item.listingPrice)}
						/>
					{/snippet}
				</ListingCard>
			{/snippet}
			{#snippet empty()}
				<EmptyState>Aucun article en vente.</EmptyState>
			{/snippet}
		</ListingStacks>
	{:catch}
		<ErrorState message="Impossible de charger les commandes." onretry={() => orders.refresh()} />
	{/await}
</Page>

<Dialog
	bind:element={dialog}
	dismissible={!saving}
	title={generatedCode ? 'Vente enregistrée' : 'Enregistrer la vente'}
	description={generatedCode
		? 'L’article est maintenant à expédier. Utilise ce code pour le repérer.'
		: 'Indique le montant réellement vendu pour passer l’article à expédier.'}
>
	{#if generatedCode}
		<p
			class="mb-6 rounded-lg bg-surface-2 p-5 text-center font-mono text-4xl font-semibold tracking-widest text-fg"
			role="status"
		>
			{generatedCode}
		</p>
		<Button class="w-full" onclick={() => dialog?.close()}>Fermer</Button>
	{:else}
		<form
			class="space-y-5"
			onsubmit={(event) => {
				event.preventDefault();
				confirm();
			}}
		>
			<Field label="Prix vendu (€)" id="listing-price">
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
				<Button variant="secondary" disabled={saving} onclick={() => dialog?.close()}
					>Annuler</Button
				>
				<Button type="submit" disabled={!valid || saving}
					>{saving ? 'Validation…' : 'Valider'}</Button
				>
			</div>
		</form>
	{/if}
</Dialog>
