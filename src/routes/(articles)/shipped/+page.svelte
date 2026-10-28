<script lang="ts">
	import { euros } from '$lib/format';
	import ArticleList from '$lib/components/listings/ArticleList.svelte';
	import Stat from '$lib/components/listings/Stat.svelte';
	import { multiplier, profitOf, totalCost } from '$lib/components/listings/articles';
</script>

<ArticleList emptyLabel="Aucun article expédié.">
	{#snippet meta(item)}
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
</ArticleList>
