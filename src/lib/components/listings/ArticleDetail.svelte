<script lang="ts" generics="T extends Article">
	import type { Snippet } from 'svelte';
	import ListingGallery from '$lib/components/images/ListingGallery.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import { toast } from '$lib/components/ui/toast.svelte';
	import { euros } from '$lib/format';
	import { deleteListing, getEditableListing } from '$lib/remote/listing-editor.remote';
	import { multiplier, profitOf, totalCost, type Article } from './articles';
	import ListingEditor from './ListingEditor.svelte';
	import Stat from './Stat.svelte';

	let {
		item,
		onclose,
		action
	}: {
		/** Article affiché ; le panneau est fermé quand il est absent. */
		item: T | undefined;
		onclose: () => void;
		/** Action de l'étape (Récupéré, Vendu, Expédié…), fournie par la page de statut. */
		action?: Snippet<[T]>;
	} = $props();

	let editing = $state(false);
	let saving = $state(false);
	let deleting = $state(false);
	let confirmDialog = $state<HTMLDialogElement>();
	let errorMessage = $state('');
	let version = $state('');
	const busy = $derived(saving || deleting);

	// Un autre article (ou la fermeture) repart sur le détail.
	$effect(() => {
		void item?.id;
		editing = false;
		errorMessage = '';
	});

	async function askDelete() {
		errorMessage = '';
		version = '';
		confirmDialog?.showModal();
		try {
			const fresh = await getEditableListing(item!.id).refresh();
			version = (fresh ?? (await getEditableListing(item!.id))).version;
		} catch {
			errorMessage = 'Impossible de charger cet article. Ferme puis réessaie.';
		}
	}

	async function confirmDelete() {
		if (!item || !version || deleting) return;
		deleting = true;
		errorMessage = '';
		try {
			const result = await deleteListing({ listingId: item.id, version });
			if (!result.ok) {
				errorMessage = result.error;
				return;
			}
			toast(`${item.brand} ${item.model} supprimé.`);
			confirmDialog?.close();
			onclose();
		} catch {
			errorMessage = 'Impossible de supprimer. Réessaie ou actualise la page.';
		} finally {
			deleting = false;
		}
	}
</script>

<Drawer
	bind:open={() => !!item, (next) => !next && onclose()}
	title={item ? (editing ? 'Modifier l’article' : `${item.brand} · ${item.model}`) : 'Article'}
	dismissible={!busy}
>
	{#if item}
		{#if editing}
			<ListingEditor
				listingId={item.id}
				bind:saving
				oncancel={() => (editing = false)}
				onsaved={() => {
					editing = false;
					toast('Article modifié');
				}}
			/>
		{:else}
			{@const total = totalCost(item)}
			{@const profit = profitOf(item)}
			<div class="space-y-5">
				<div class="aspect-square overflow-hidden rounded-lg bg-surface-2">
					<ListingGallery listingId={item.id} brand={item.brand} model={item.model} />
				</div>
				<div>
					<p class="text-fg-muted">{item.size ?? '—'} · {item.color ?? '—'}</p>
					<p class="mt-1 text-sm text-fg">Stockage : {item.stockingPlace ?? 'Non renseigné'}</p>
					{#if item.reference}
						<p class="mt-1 font-mono text-sm font-semibold tracking-widest text-fg">
							Réf. {item.reference}
						</p>
					{/if}
				</div>
				<div class="grid grid-cols-2 gap-4 rounded-lg bg-surface-2 p-4">
					<Stat label="Achat total" value={euros(total)} />
					<Stat
						label="Prix de mise en vente"
						value={item.listingPrice == null ? '—' : euros(item.listingPrice)}
					/>
					<Stat label="Prix vendu" value={item.salePrice == null ? '—' : euros(item.salePrice)} />
					<Stat
						label="Bénéfice"
						tone={profit === null ? 'default' : profit < 0 ? 'danger' : 'success'}
						value={profit === null ? '—' : euros(profit)}
					/>
					<Stat
						label="Multiplicateur"
						title={total === 0 && item.salePrice != null
							? 'Multiplicateur non calculable : achat total nul'
							: undefined}
						value={item.salePrice == null ? '—' : multiplier(item.salePrice, total)}
					/>
				</div>
				{#if action}<div class="flex">{@render action(item)}</div>{/if}
				<div class="flex justify-end gap-3 border-t border-border pt-4">
					<Button variant="secondary" onclick={() => (editing = true)}>Modifier</Button>
					<Button variant="danger" onclick={askDelete}>Supprimer</Button>
				</div>
			</div>
		{/if}
	{/if}
</Drawer>

<Dialog bind:element={confirmDialog} dismissible={!deleting} title="Supprimer l’article">
	{#if item}
		<p class="text-sm text-fg-muted">
			Supprimer {item.brand} · {item.model} ? L’article, son historique et sa référence seront supprimés.
			Cette action est définitive.
		</p>
		{#if errorMessage}<p class="mt-4 text-sm text-danger" role="alert">{errorMessage}</p>{/if}
		<div class="mt-6 flex justify-end gap-3">
			<Button variant="secondary" disabled={deleting} onclick={() => confirmDialog?.close()}
				>Annuler</Button
			>
			<Button variant="danger" disabled={deleting || !version} onclick={confirmDelete}
				>{deleting ? 'Suppression…' : 'Supprimer'}</Button
			>
		</div>
	{/if}
</Dialog>
