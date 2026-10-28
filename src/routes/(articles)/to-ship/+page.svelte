<script lang="ts">
	import { euros } from '$lib/format';
	import ArticleList from '$lib/components/listings/ArticleList.svelte';
	import Stat from '$lib/components/listings/Stat.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { multiplier, profitOf, totalCost } from '$lib/components/listings/articles';
	import { toast } from '$lib/components/ui/toast.svelte';
	import { shipListing } from '$lib/remote/sales.remote';
	let pendingIds = $state<string[]>([]);
	let errorMessage = $state('');
	async function markShipped(item: { id: string; brand: string; model: string }) {
		const id = item.id;
		if (pendingIds.includes(id)) return;
		pendingIds = [...pendingIds, id];
		errorMessage = '';
		try {
			await shipListing({ listingId: id });
			toast(`${item.brand} ${item.model} expédié.`);
		} catch {
			errorMessage =
				'Impossible de marquer l’article comme expédié. Réessaie ou actualise la page.';
		} finally {
			pendingIds = pendingIds.filter((pendingId) => pendingId !== id);
		}
	}
</script>

{#if errorMessage}<p role="alert" class="mb-4 text-sm text-danger">{errorMessage}</p>{/if}
<ArticleList emptyLabel="Aucun article à expédier.">
	{#snippet meta(item)}
		<p class="mt-1 font-mono text-sm font-semibold tracking-widest text-fg">
			Réf. {item.reference ?? 'Non renseignée'}
		</p>
		<p class="mt-1 text-sm text-fg">Stockage : {item.stockingPlace ?? 'Non renseigné'}</p>
	{/snippet}
	{#snippet figures(item)}
		{@const total = totalCost(item)}
		{@const profit = profitOf(item)}
		<Stat label="Achat total" value={euros(total)} />
		<Stat
			label="Prix vendu"
			align="right"
			value={item.salePrice == null ? '—' : euros(item.salePrice)}
		/>
		<Stat
			label="Bénéfice"
			tone={profit !== null && profit < 0 ? 'danger' : 'success'}
			value={profit === null ? '—' : euros(profit)}
		/>
		<Stat
			label="Multiplicateur"
			align="right"
			title={total === 0 ? 'Multiplicateur non calculable : achat total nul' : undefined}
			value={item.salePrice == null ? '—' : multiplier(item.salePrice, total)}
		/>
	{/snippet}
	{#snippet action(item)}
		<Button
			onclick={() => markShipped(item)}
			disabled={pendingIds.includes(item.id)}
			aria-label={`Expédié : ${item.brand} ${item.model}`}
			size="sm">{pendingIds.includes(item.id) ? 'Validation…' : 'Expédié'}</Button
		>
	{/snippet}
</ArticleList>
