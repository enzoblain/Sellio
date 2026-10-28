<script lang="ts">
	import { euros } from '$lib/format';
	import ArticleList from '$lib/components/listings/ArticleList.svelte';
	import Stat from '$lib/components/listings/Stat.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { toast } from '$lib/components/ui/toast.svelte';
	import { listStockItem } from '$lib/remote/listings.remote';

	let selected = $state<{ id: string; name: string } | null>(null);
	let salePrice = $state<number | undefined>();
	let saving = $state(false);
	let errorMessage = $state('');
	let dialog = $state<HTMLDialogElement>();
	const valid = $derived(
		salePrice !== undefined && Number.isFinite(salePrice) && salePrice >= 0.01
	);

	function openTransition(item: { id: string; brand: string; model: string }) {
		selected = { id: item.id, name: `${item.brand} ${item.model}` };
		salePrice = undefined;
		errorMessage = '';
		dialog?.showModal();
	}

	async function confirm() {
		if (!valid || !selected || saving) return;
		saving = true;
		errorMessage = '';
		try {
			await listStockItem({ listingId: selected.id, listingPrice: salePrice! });
			dialog?.close();
			toast(`${selected.name} mis en vente.`);
		} catch {
			errorMessage = 'Impossible de valider cet article. Réessaie ou actualise la page.';
		} finally {
			saving = false;
		}
	}
</script>

<ArticleList emptyLabel="Aucun article en stock.">
	{#snippet meta(item)}
		<p class="mt-1 text-sm text-fg">Stockage : {item.stockingPlace ?? 'Non renseigné'}</p>
	{/snippet}
	{#snippet figures(item)}
		<Stat label="Achat total" value={euros(item.purchasePrice + item.shippingPrice)} />
	{/snippet}
	{#snippet action(item)}
		<Button
			onclick={() => openTransition(item)}
			aria-label={`Mettre en vente : ${item.brand} ${item.model}`}
			size="sm">Mettre en vente</Button
		>
	{/snippet}
</ArticleList>

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
