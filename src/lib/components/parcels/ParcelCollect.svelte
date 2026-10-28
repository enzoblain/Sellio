<script lang="ts">
	import { euros } from '$lib/format';
	import { matchesQuery, type Article } from '$lib/components/listings/articles';
	import { totalCents } from '$lib/components/listings/insert-total';
	import ListingFields from '$lib/components/listings/ListingFields.svelte';
	import Autocomplete from '$lib/components/form/Autocomplete.svelte';
	import type { AutocompleteItem } from '$lib/components/form/Autocomplete.svelte.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import { toast } from '$lib/components/ui/toast.svelte';
	import { getToCollectListings } from '$lib/remote/listings.remote';
	import { markParcelCollected } from '$lib/remote/parcels.remote';
	import { searchStockingPlaces } from '$lib/remote/stocking-places.remote';

	type Draft = {
		key: number;
		brand: AutocompleteItem;
		model: AutocompleteItem;
		size: AutocompleteItem;
		color: AutocompleteItem;
		purchasePrice: number;
		shippingPrice: number;
	};

	let {
		open = $bindable(false),
		parcel,
		oncollected
	}: {
		open?: boolean;
		parcel: { id: string; carrier: string };
		oncollected?: () => void;
	} = $props();

	const empty = (): AutocompleteItem => ({ value: '', uuid: null });

	const query = $derived(getToCollectListings());
	const articles = $derived<Article[]>((query.current as Article[] | undefined) ?? []);

	let step = $state<'list' | 'new'>('list');
	let q = $state('');
	let checked = $state<string[]>([]);
	let drafts = $state<Draft[]>([]);
	let stockingPlace = $state<AutocompleteItem>(empty());
	let saving = $state(false);
	let errorMessage = $state('');
	let confirmDialog = $state<HTMLDialogElement>();
	let nextKey = 0;

	// Formulaire « Nouvel article »
	let brand = $state(empty());
	let model = $state(empty());
	let size = $state(empty());
	let color = $state(empty());
	let price = $state<number | undefined>();
	let shippingCost = $state<number | undefined>();

	const visible = $derived(articles.filter((article) => matchesQuery(article, q)));
	// Un article récupéré entre-temps ailleurs disparaît de la liste : il ne compte plus.
	const selectedIds = $derived(checked.filter((id) => articles.some((a) => a.id === id)));
	const count = $derived(selectedIds.length + drafts.length);
	const placeValid = $derived(stockingPlace.value.trim().length > 0);
	const draftValid = $derived(
		[brand, model, size, color].every((item) => item.value.trim().length > 0) &&
			price !== undefined &&
			price >= 0 &&
			shippingCost !== undefined &&
			shippingCost >= 0
	);
	const placeQuery = (search: string, offset: number, limit: number) =>
		searchStockingPlaces({ search, offset, limit });

	function reset() {
		step = 'list';
		q = '';
		checked = [];
		drafts = [];
		stockingPlace = empty();
		errorMessage = '';
		resetDraft();
	}

	function resetDraft() {
		brand = empty();
		model = empty();
		size = empty();
		color = empty();
		price = undefined;
		shippingCost = undefined;
	}

	let wasOpen = false;
	$effect(() => {
		if (open && !wasOpen) reset();
		wasOpen = open;
	});

	function toggle(id: string) {
		checked = checked.includes(id) ? checked.filter((value) => value !== id) : [...checked, id];
	}

	function addDraft() {
		if (!draftValid) return;
		drafts.push({
			key: nextKey++,
			brand,
			model,
			size,
			color,
			purchasePrice: price!,
			shippingPrice: shippingCost!
		});
		resetDraft();
		step = 'list';
	}

	function submit() {
		if (saving) return;
		if (count === 0) {
			confirmDialog?.showModal();
			return;
		}
		if (!placeValid) return;
		collect();
	}

	async function collect() {
		if (saving) return;
		saving = true;
		errorMessage = '';
		try {
			const result = await markParcelCollected({
				parcelId: parcel.id,
				stockingPlace: count && placeValid ? stockingPlace : null,
				listingIds: selectedIds,
				newListings: drafts.map((draft) => ({
					brand: draft.brand,
					model: draft.model,
					size: draft.size,
					color: draft.color,
					purchasePrice: draft.purchasePrice,
					shippingPrice: draft.shippingPrice
				}))
			});
			const done = result.collected.length + result.created.length;
			confirmDialog?.close();
			open = false;
			oncollected?.();
			toast(
				done === 0
					? 'Colis passé en Récupérés'
					: `${done} article${done > 1 ? 's' : ''} récupéré${done > 1 ? 's' : ''}, placé${done > 1 ? 's' : ''} en stock`
			);
		} catch {
			confirmDialog?.close();
			errorMessage = 'Impossible d’enregistrer la récupération. Réessaie ou actualise la page.';
		} finally {
			saving = false;
		}
	}
</script>

<Drawer bind:open dismissible={!saving} title="Colis {parcel.carrier} : articles récupérés">
	{#if step === 'new'}
		<form
			class="space-y-5"
			onsubmit={(event) => {
				event.preventDefault();
				addDraft();
			}}
		>
			<ListingFields
				idPrefix="parcel-"
				bind:brand
				bind:model
				bind:size
				bind:color
				bind:price
				bind:shippingCost
			/>
			<div class="flex justify-end gap-3">
				<Button variant="secondary" onclick={() => (step = 'list')}>Retour</Button>
				<Button type="submit" disabled={!draftValid}>Ajouter à la liste</Button>
			</div>
		</form>
	{:else}
		<form
			class="space-y-5"
			onsubmit={(event) => {
				event.preventDefault();
				submit();
			}}
		>
			<p class="text-sm text-fg-muted">
				Coche les articles qui étaient dans ce colis. Les autres restent à récupérer.
			</p>
			<SearchInput bind:value={q} aria-label="Rechercher un article" placeholder="Rechercher…" />
			<ul class="space-y-2">
				{#each drafts as draft (draft.key)}
					<li
						class="flex items-center gap-3 rounded-lg border border-accent bg-surface p-3 text-sm"
					>
						<span class="min-w-0 flex-1">
							<span class="block truncate font-medium text-fg">
								{draft.brand.value}
								{draft.model.value}
							</span>
							<span class="block text-xs text-fg-muted">
								{draft.size.value} · {draft.color.value} · nouvel article · {euros(
									totalCents(draft.purchasePrice, draft.shippingPrice)
								)}
							</span>
						</span>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => (drafts = drafts.filter((d) => d.key !== draft.key))}
							aria-label="Retirer {draft.brand.value} {draft.model.value}">Retirer</Button
						>
					</li>
				{/each}
				{#each visible as article (article.id)}
					<li>
						<label
							class="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3 text-sm has-[:checked]:border-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
						>
							<input
								type="checkbox"
								checked={checked.includes(article.id)}
								onchange={() => toggle(article.id)}
								class="h-5 w-5 shrink-0 accent-accent"
							/>
							<span class="min-w-0 flex-1">
								<span class="block truncate font-medium text-fg">
									{article.brand}
									{article.model}
								</span>
								<span class="block text-xs text-fg-muted">
									{article.size} · {article.color}
								</span>
							</span>
							<span class="text-xs text-fg-muted tabular-nums">
								{euros(article.purchasePrice + article.shippingPrice)}
							</span>
						</label>
					</li>
				{:else}
					{#if drafts.length === 0}
						<li>
							<EmptyState>
								{articles.length === 0
									? 'Aucun article à récupérer.'
									: 'Aucun article ne correspond à ta recherche.'}
							</EmptyState>
						</li>
					{/if}
				{/each}
			</ul>
			<Button variant="secondary" onclick={() => (step = 'new')}>Nouvel article</Button>
			<Field label="Lieu de stockage" id="parcel-stocking-place">
				<Autocomplete
					id="parcel-stocking-place"
					query={placeQuery}
					bind:model={stockingPlace}
					disabled={saving}
				/>
			</Field>
			{#if errorMessage}<p role="alert" class="text-sm text-danger">{errorMessage}</p>{/if}
			<div class="sticky bottom-0 -mx-6 -mb-6 border-t border-border bg-surface p-4">
				<Button type="submit" class="w-full" disabled={saving || (count > 0 && !placeValid)}>
					{#if saving}
						Enregistrement…
					{:else if count === 0}
						Récupérer sans article
					{:else}
						Récupérer {count} article{count > 1 ? 's' : ''}
					{/if}
				</Button>
			</div>
		</form>
	{/if}
</Drawer>

<Dialog
	bind:element={confirmDialog}
	title="Aucun article coché"
	description="Le colis passera en Récupérés sans article lié. Les {articles.length} article{articles.length >
	1
		? 's'
		: ''} à récupérer restent inchangés."
	dismissible={!saving}
>
	<div class="flex justify-end gap-3">
		<Button variant="ghost" onclick={() => confirmDialog?.close()} disabled={saving}>Annuler</Button
		>
		<Button onclick={collect} disabled={saving}>{saving ? 'Enregistrement…' : 'Confirmer'}</Button>
	</div>
</Dialog>
