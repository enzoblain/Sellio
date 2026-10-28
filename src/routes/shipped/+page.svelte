<script lang="ts">
	import { euros } from '$lib/format';
	import ListingStacks from '$lib/components/listings/ListingStacks.svelte';
	import ListingCard from '$lib/components/listings/ListingCard.svelte';
	import Stat from '$lib/components/listings/Stat.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Page from '$lib/components/ui/Page.svelte';
	import { getShippedListings } from '$lib/remote/listings.remote';
	const orders = getShippedListings();
	const multiplier = (salePrice: number, total: number) =>
		total > 0
			? `×${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(salePrice / total)}`
			: '—';
</script>

<Page title="Expédié" wide>
	{#await orders}
		<p class="text-sm text-fg-muted">Chargement des commandes…</p>
	{:then items}
		<ListingStacks {items}>
			{#snippet card(item, stackButton)}
				{@const total = item.purchasePrice + item.shippingPrice}
				{@const profit = item.salePrice === null ? null : item.salePrice - total}
				<ListingCard {item} {stackButton}>
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
				<EmptyState>Aucun article expédié.</EmptyState>
			{/snippet}
		</ListingStacks>
	{:catch}
		<ErrorState message="Impossible de charger les commandes." onretry={() => orders.refresh()} />
	{/await}
</Page>
