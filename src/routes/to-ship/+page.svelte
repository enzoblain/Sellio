<script lang="ts">
	import { euros } from '$lib/format';
	import ListingStacks from '$lib/components/listings/ListingStacks.svelte';
	import ListingCard from '$lib/components/listings/ListingCard.svelte';
	import Stat from '$lib/components/listings/Stat.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Page from '$lib/components/ui/Page.svelte';
	import { getToShipListings } from '$lib/remote/listings.remote';
	import { shipListing } from '$lib/remote/sales.remote';
	const orders = getToShipListings();
	let pendingIds = $state<string[]>([]);
	let errorMessage = $state('');
	const multiplier = (salePrice: number, total: number) =>
		total > 0
			? `×${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(salePrice / total)}`
			: '—';
	async function markShipped(id: string) {
		if (pendingIds.includes(id)) return;
		pendingIds = [...pendingIds, id];
		errorMessage = '';
		try {
			await shipListing({ listingId: id });
		} catch {
			errorMessage =
				'Impossible de marquer l’article comme expédié. Réessaie ou actualise la page.';
		} finally {
			pendingIds = pendingIds.filter((pendingId) => pendingId !== id);
		}
	}
</script>

<Page title="À expédier" wide>
	{#if errorMessage}<p role="alert" class="mb-4 text-sm text-danger">{errorMessage}</p>{/if}
	{#await orders}
		<p class="text-sm text-fg-muted">Chargement des commandes…</p>
	{:then items}
		<ListingStacks {items}>
			{#snippet card(item, stackButton)}
				{@const total = item.purchasePrice + item.shippingPrice}
				{@const profit = item.salePrice === null ? null : item.salePrice - total}
				<ListingCard {item} {stackButton}>
					{#snippet action()}
						<Button
							onclick={() => markShipped(item.id)}
							disabled={pendingIds.includes(item.id)}
							aria-label={`Marquer comme expédié : ${item.brand} ${item.model}`}
							size="sm"
							class="shadow-sm">{pendingIds.includes(item.id) ? 'Validation…' : '✓ Expédié'}</Button
						>
					{/snippet}
					<p class="mb-2 font-mono text-sm font-semibold tracking-widest text-fg">
						Réf. {item.reference ?? 'Non renseignée'}
					</p>
					<h2 class="font-medium text-fg">{item.brand} · {item.model}</h2>
					<p class="mt-1 text-sm text-fg-muted">{item.size} · {item.color}</p>
					<p class="mt-2 text-sm text-fg">Stockage : {item.stockingPlace ?? 'Non renseigné'}</p>
					{#snippet footer()}
						<Stat label="Achat total" value={euros(total)} />
						<Stat
							label="Prix vendu"
							align="right"
							value={item.salePrice === null ? '—' : euros(item.salePrice)}
						/>
					{/snippet}
					{#snippet extra()}
						<Stat
							label="Bénéfice"
							tone={profit !== null && profit < 0 ? 'danger' : 'success'}
							value={profit === null ? '—' : euros(profit)}
						/>
						<Stat
							label="Multiplicateur"
							align="right"
							title={total === 0 ? 'Multiplicateur non calculable : achat total nul' : undefined}
							value={item.salePrice === null ? '—' : multiplier(item.salePrice, total)}
						/>
					{/snippet}
				</ListingCard>
			{/snippet}
			{#snippet empty()}
				<EmptyState>Aucun article à expédier.</EmptyState>
			{/snippet}
		</ListingStacks>
	{:catch}
		<ErrorState message="Impossible de charger les commandes." onretry={() => orders.refresh()} />
	{/await}
</Page>
