<script lang="ts">
	import { euros } from '$lib/format';
	import ArticleList from '$lib/components/listings/ArticleList.svelte';
	import Stat from '$lib/components/listings/Stat.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { toast } from '$lib/components/ui/toast.svelte';
	import { sellListing } from '$lib/remote/sales.remote';

	let selected = $state<{ id: string; name: string } | null>(null);
	let salePrice = $state<number | undefined>();
	let generatedCode = $state('');
	let saving = $state(false);
	let errorMessage = $state('');
	let dialog = $state<HTMLDialogElement>();
	const valid = $derived(
		salePrice !== undefined && Number.isFinite(salePrice) && salePrice >= 0.01
	);

	function openTransition(item: { id: string; brand: string; model: string }) {
		selected = { id: item.id, name: `${item.brand} ${item.model}` };
		salePrice = undefined;
		generatedCode = '';
		errorMessage = '';
		dialog?.showModal();
	}

	async function confirm() {
		if (!valid || !selected || saving) return;
		saving = true;
		errorMessage = '';
		try {
			const result = await sellListing({ listingId: selected.id, salePrice: salePrice! });
			generatedCode = result.code;
			toast(`${selected.name} vendu, code ${result.code}.`);
		} catch {
			errorMessage = 'Impossible de valider cet article. Réessaie ou actualise la page.';
		} finally {
			saving = false;
		}
	}
</script>

<ArticleList emptyLabel="Aucun article en vente.">
	{#snippet meta(item)}
		<p class="mt-1 text-sm text-fg">Stockage : {item.stockingPlace ?? 'Non renseigné'}</p>
	{/snippet}
	{#snippet figures(item)}
		<Stat label="Achat total" value={euros(item.purchasePrice + item.shippingPrice)} />
		<Stat
			label="Prix de vente"
			align="right"
			value={item.listingPrice == null ? '—' : euros(item.listingPrice)}
		/>
	{/snippet}
	{#snippet action(item)}
		<Button
			onclick={() => openTransition(item)}
			aria-label={`Vendu : ${item.brand} ${item.model}`}
			size="sm">Vendu</Button
		>
	{/snippet}
</ArticleList>

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
