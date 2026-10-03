<script lang="ts">
	import ListingStacks from '$lib/components/listings/ListingStacks.svelte';
	import ListingGallery from '$lib/components/images/ListingGallery.svelte';
	import ListingEditor from '$lib/components/listings/ListingEditor.svelte';
	import { getStockListings } from '$lib/remote/listings.remote';
	import { sellListing } from '$lib/remote/sales.remote';

	const orders = getStockListings();
	let selectedId = $state<string | null>(null);
	let salePrice = $state<number | undefined>();
	let generatedCode = $state('');
	let saving = $state(false);
	let errorMessage = $state('');
	let dialog: HTMLDialogElement;
	const valid = $derived(
		salePrice !== undefined && Number.isFinite(salePrice) && salePrice >= 0.01
	);
	const euros = (cents: number) =>
		new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);

	function openTransition(id: string) {
		selectedId = id;
		salePrice = undefined;
		generatedCode = '';
		errorMessage = '';
		dialog.showModal();
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

<div class="min-h-screen bg-gray-50 px-6 py-6">
	<div class="mb-6 flex items-center justify-between gap-4">
		<h1 class="text-xl font-semibold text-violet-950">Stock</h1>
	</div>
	{#await orders}
		<p class="text-sm text-gray-500">Chargement des commandes…</p>
	{:then items}
		<ListingStacks {items}>
			{#snippet card(item, stackButton)}
				<article class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
					<div class="relative flex aspect-square items-center justify-center bg-violet-50">
						<ListingEditor listingId={item.id} />
						<ListingGallery listingId={item.id} brand={item.brand} model={item.model} />
						<div class="absolute top-3 right-3 flex items-center gap-2">
							<button
								type="button"
								onclick={() => openTransition(item.id)}
								aria-label={`Enregistrer la vente de ${item.brand} ${item.model}`}
								class="rounded-lg bg-violet-950 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-900"
								>✓ Valider</button
							>
							{@render stackButton()}
						</div>
					</div>
					<div class="px-4 py-3">
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
								{euros(item.purchasePrice + item.shippingPrice)}
							</p>
						</div>
						<div class="text-right">
							<p class="text-xs text-gray-500">Prix de vente</p>
							<p class="font-semibold text-violet-950">
								{item.listingPrice === null ? '—' : euros(item.listingPrice)}
							</p>
						</div>
					</div>
				</article>
			{/snippet}
			{#snippet empty()}
				<p
					class="col-span-full rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500"
				>
					Aucun article en vente.
				</p>
			{/snippet}
		</ListingStacks>
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
	{#if generatedCode}
		<h2 class="text-lg font-semibold text-violet-950">Vente enregistrée</h2>
		<p class="mt-2 text-sm text-gray-500">
			L’article est maintenant à expédier. Utilise ce code pour le repérer.
		</p>
		<p
			class="my-6 rounded-lg bg-violet-50 p-5 text-center font-mono text-4xl font-semibold tracking-widest text-violet-950"
			role="status"
		>
			{generatedCode}
		</p>
		<button
			type="button"
			onclick={() => dialog.close()}
			class="w-full rounded-lg bg-violet-950 px-4 py-2 text-sm font-medium text-white"
			>Fermer</button
		>
	{:else}
		<h2 class="text-lg font-semibold text-violet-950">Enregistrer la vente</h2>
		<p class="mt-1 text-sm text-gray-500">
			Indique le montant réellement vendu pour passer l’article à expédier.
		</p>
		<form
			class="mt-6 space-y-5"
			onsubmit={(event) => {
				event.preventDefault();
				confirm();
			}}
		>
			<div>
				<label for="listing-price" class="mb-2 block text-sm font-medium text-gray-700"
					>Prix vendu (€)</label
				>
				<input
					id="listing-price"
					type="number"
					min="0.01"
					step="0.01"
					required
					bind:value={salePrice}
					disabled={saving}
					placeholder="0,00"
					class="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
				/>
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
	{/if}
</dialog>
