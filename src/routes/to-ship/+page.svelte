<script lang="ts">
	import ListingEditor from '$lib/components/listings/ListingEditor.svelte';
	import { getToShipListings } from '$lib/remote/listings.remote';
	import { shipListing } from '$lib/remote/sales.remote';
	const orders = getToShipListings();
	let pendingIds = $state<string[]>([]);
	let errorMessage = $state('');
	const euros = (cents: number) =>
		new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
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

<div class="min-h-screen bg-gray-50 px-6 py-6">
	<div class="mb-6 flex items-center justify-between gap-4">
		<h1 class="text-xl font-semibold text-violet-950">À expédier</h1>
	</div>
	{#if errorMessage}<p role="alert" class="mb-4 text-sm text-red-600">{errorMessage}</p>{/if}
	{#await orders}
		<p class="text-sm text-gray-500">Chargement des commandes…</p>
	{:then items}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
			{#each items as item (item.id)}
				{@const total = item.purchasePrice + item.shippingPrice}
				{@const profit = item.salePrice === null ? null : item.salePrice - total}
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
							onclick={() => markShipped(item.id)}
							disabled={pendingIds.includes(item.id)}
							aria-label={`Marquer comme expédié : ${item.brand} ${item.model}`}
							class="absolute top-3 right-3 rounded-lg bg-violet-950 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-900 disabled:cursor-not-allowed disabled:opacity-50"
							>{pendingIds.includes(item.id) ? 'Validation…' : '✓ Expédié'}</button
						>
					</div>
					<div class="px-4 py-3">
						<p class="mb-2 font-mono text-sm font-semibold tracking-widest text-violet-950">
							Réf. {item.reference ?? 'Non renseignée'}
						</p>
						<h2 class="font-medium text-gray-900">{item.brand} · {item.model}</h2>
						<p class="mt-1 text-sm text-gray-500">{item.size} · {item.color}</p>
						<p class="mt-2 text-sm text-violet-950">
							Stockage : {item.stockingPlace ?? 'Non renseigné'}
						</p>
					</div>
					<div
						class="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-3"
					>
						<div>
							<p class="text-xs text-gray-500">Achat total</p>
							<p class="font-semibold text-violet-950">
								{euros(total)}
							</p>
						</div>
						<div class="text-right">
							<p class="text-xs text-gray-500">Prix vendu</p>
							<p class="font-semibold text-violet-950">
								{item.salePrice === null ? '—' : euros(item.salePrice)}
							</p>
						</div>
					</div>
					<div
						class="flex items-center justify-between gap-3 border-t border-gray-100 bg-white px-4 py-3"
					>
						<div>
							<p class="text-xs text-gray-500">Bénéfice</p>
							<p
								class="font-semibold {profit !== null && profit < 0
									? 'text-red-600'
									: 'text-emerald-700'}"
							>
								{profit === null ? '—' : euros(profit)}
							</p>
						</div>
						<div class="text-right">
							<p class="text-xs text-gray-500">Multiplicateur</p>
							<p
								class="font-semibold text-violet-950"
								title={total === 0 ? 'Multiplicateur non calculable : achat total nul' : undefined}
							>
								{item.salePrice === null ? '—' : multiplier(item.salePrice, total)}
							</p>
						</div>
					</div>
				</article>
			{:else}
				<p
					class="col-span-full rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500"
				>
					Aucun article à expédier.
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
