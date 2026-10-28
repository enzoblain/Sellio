<script lang="ts">
	import ModelPhotos from '$lib/components/images/ModelPhotos.svelte';
	import { resolve } from '$app/paths';
	import PhotoPicker from '$lib/components/images/PhotoPicker.svelte';
	import { photoForm, type PhotoDraft } from '$lib/components/images/photo-draft';
	import { refreshListingViews } from './refresh-views';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Autocomplete from '$lib/components/form/Autocomplete.svelte';
	import type { AutocompleteItem } from '$lib/components/form/Autocomplete.svelte.js';
	import { getEditableListing, deleteListing } from '$lib/remote/listing-editor.remote';
	import { searchBrands } from '$lib/remote/brands.remote';
	import { searchModels } from '$lib/remote/models.remote';
	import { searchSizes } from '$lib/remote/sizes.remote';
	import { searchColors } from '$lib/remote/colors.remote';
	import { searchStockingPlaces } from '$lib/remote/stocking-places.remote';
	let { listingId }: { listingId: string } = $props();
	let dialog = $state<HTMLDialogElement>();
	let mode = $state<'edit' | 'delete'>('edit');
	let loading = $state(false);
	let saving = $state(false);
	let errorMessage = $state('');
	let version = $state('');
	let brand = $state<AutocompleteItem>({ value: '', uuid: null });
	let model = $state<AutocompleteItem>({ value: '', uuid: null });
	let size = $state<AutocompleteItem>({ value: '', uuid: null });
	let color = $state<AutocompleteItem>({ value: '', uuid: null });
	let place = $state<AutocompleteItem>({ value: '', uuid: null });
	let purchasePrice = $state<number | undefined>();
	let shippingPrice = $state<number | undefined>();
	let listingPrice = $state<number | undefined>();
	let salePrice = $state<number | undefined>();
	let status = $state(0);
	let reference = $state<string | null>(null);
	let photos = $state<PhotoDraft[]>([]);
	let cover = $state<string | null>(null);
	let formKey = $state(0);
	let photoBusy = $state(false);
	let modelPhotoBusy = $state(false);
	let previousBrand = $state('');
	const statuses = [
		'À récupérer',
		'Listé / en vente',
		'À expédier',
		'Expédié',
		'Terminé',
		'Retourné',
		'En stock'
	];
	const brandQuery = (search: string, offset: number, limit: number) =>
		searchBrands({ search, offset, limit });
	const modelQuery = (search: string, offset: number, limit: number) =>
		brand.uuid ? searchModels({ search, offset, limit, brandId: brand.uuid }) : Promise.resolve([]);
	const sizeQuery = (search: string, offset: number, limit: number) =>
		searchSizes({ search, offset, limit });
	const colorQuery = (search: string, offset: number, limit: number) =>
		searchColors({ search, offset, limit });
	const placeQuery = (search: string, offset: number, limit: number) =>
		searchStockingPlaces({ search, offset, limit });
	$effect(() => {
		const key = `${brand.uuid ?? ''}:${brand.value}`;
		if (!loading && version && key !== previousBrand) {
			previousBrand = key;
			model = { uuid: null, value: '' };
		}
	});
	const validation = $derived.by(() => {
		if (photoBusy || modelPhotoBusy) return 'Vérification des photos en cours…';
		if (![brand, model, size, color].every((field) => field.value.trim()))
			return 'Renseigne la marque, le modèle, la taille et la couleur.';
		if (
			purchasePrice === undefined ||
			!Number.isFinite(purchasePrice) ||
			purchasePrice < 0 ||
			shippingPrice === undefined ||
			!Number.isFinite(shippingPrice) ||
			shippingPrice < 0
		)
			return 'Renseigne un prix d’achat et des frais de port positifs ou nuls.';
		if (
			[listingPrice, salePrice].some(
				(price) => price !== undefined && Number.isFinite(price) && price < 0
			)
		)
			return 'Les prix doivent être positifs ou nuls.';
		if (status >= 1 && status <= 5 && (!Number.isFinite(listingPrice) || listingPrice! < 0.01))
			return 'Ce statut nécessite un prix de mise en vente.';
		if (status >= 1 && !place.value.trim()) return 'Ce statut nécessite un lieu de stockage.';
		if (status >= 2 && status <= 5 && (!Number.isFinite(salePrice) || salePrice! < 0.01))
			return 'Ce statut nécessite un prix vendu.';
		return '';
	});
	async function open(nextMode: 'edit' | 'delete') {
		mode = nextMode;
		loading = true;
		errorMessage = '';
		version = '';
		dialog?.showModal();
		try {
			const data = await getEditableListing(listingId).refresh();
			const item = data ?? (await getEditableListing(listingId));
			brand = item.brand;
			model = item.model;
			size = item.size;
			color = item.color;
			place = item.stockingPlace ?? { value: '', uuid: null };
			purchasePrice = item.purchasePrice;
			shippingPrice = item.shippingPrice;
			listingPrice = item.listingPrice ?? undefined;
			salePrice = item.salePrice ?? undefined;
			status = item.status;
			reference = item.reference;
			photos = item.photos.map((photo) => ({ token: photo.id, path: photo.path }));
			cover = item.photos.find((photo) => photo.isCover)?.id ?? item.photos[0]?.id ?? null;
			previousBrand = `${brand.uuid ?? ''}:${brand.value}`;
			version = item.version;
			formKey += 1;
		} catch {
			errorMessage = 'Impossible de charger cet article. Ferme puis réessaie.';
		} finally {
			loading = false;
		}
	}
	async function confirm() {
		if (saving || loading || !version || (mode === 'edit' && validation)) return;
		saving = true;
		errorMessage = '';
		try {
			let result: { ok: boolean; error?: string };
			if (mode === 'delete') result = await deleteListing({ listingId, version });
			else {
				const form = photoForm(photos, cover);
				form.append(
					'article',
					JSON.stringify({
						listingId,
						version,
						brand,
						model,
						size,
						color,
						purchasePrice: purchasePrice!,
						shippingPrice: shippingPrice!,
						listingPrice: Number.isFinite(listingPrice) ? listingPrice : null,
						salePrice: Number.isFinite(salePrice) ? salePrice : null,
						stockingPlace: place.value.trim() ? place : null,
						status
					})
				);
				const response = await fetch(resolve('/api/listings/[id]', { id: listingId }), {
					method: 'PUT',
					body: form
				});
				result = await response.json();
				if (result.ok) await refreshListingViews(listingId);
			}

			if (!result.ok) {
				errorMessage = result.error ?? 'Impossible d’enregistrer.';
				return;
			}
			dialog?.close();
		} catch {
			errorMessage = 'Impossible d’enregistrer. Vérifie les champs et réessaie.';
		} finally {
			saving = false;
		}
	}
</script>

<div class="absolute top-3 left-3 z-10 flex gap-1.5">
	<button
		type="button"
		onclick={() => open('edit')}
		aria-label="Modifier l’article"
		title="Modifier"
		class="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface/95 text-fg shadow-sm hover:bg-surface-2"
		><svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			class="h-4 w-4"
			aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6L16 3Z" /><path d="m13 6 5 5" /></svg
		></button
	>
	<button
		type="button"
		onclick={() => open('delete')}
		aria-label="Supprimer l’article"
		title="Supprimer"
		class="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface/95 text-danger shadow-sm hover:bg-surface-2"
		><svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			class="h-4 w-4"
			aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg
		></button
	>
</div>
<Dialog
	bind:element={dialog}
	dismissible={!saving}
	size="lg"
	title={mode === 'edit' ? 'Modifier l’article' : 'Supprimer l’article'}
>
	{#if loading}<p class="text-sm text-fg-muted">Chargement…</p>
	{:else if version}
		<form
			class="space-y-5"
			onsubmit={(event) => {
				event.preventDefault();
				confirm();
			}}
		>
			{#if mode === 'delete'}
				<p class="text-sm text-fg-muted">
					Supprimer {brand.value} · {model.value} ? L’article, son historique et sa référence seront supprimés.
					Cette action est définitive.
				</p>
			{:else}
				{#key formKey}<div class="grid gap-4 sm:grid-cols-2">
						<Field label="Marque" id={`edit-brand-${listingId}`}>
							<Autocomplete
								id={`edit-brand-${listingId}`}
								query={brandQuery}
								bind:model={brand}
								disabled={saving}
							/>
						</Field>
						<Field label="Modèle" id={`edit-model-${listingId}`}>
							<Autocomplete
								id={`edit-model-${listingId}`}
								query={modelQuery}
								bind:model
								disabled={saving || !brand.value.trim()}
							/>
						</Field>
						<Field label="Taille" id={`edit-size-${listingId}`}>
							<Autocomplete
								id={`edit-size-${listingId}`}
								query={sizeQuery}
								bind:model={size}
								disabled={saving}
							/>
						</Field>
						<Field label="Couleur" id={`edit-color-${listingId}`}>
							<Autocomplete
								id={`edit-color-${listingId}`}
								query={colorQuery}
								bind:model={color}
								disabled={saving}
							/>
						</Field>
						<Field label={`Stockage${status >= 1 ? ' *' : ''}`} id={`edit-place-${listingId}`}>
							<Autocomplete
								id={`edit-place-${listingId}`}
								query={placeQuery}
								bind:model={place}
								disabled={saving}
							/>
						</Field>
						<Field label="Statut" id={`edit-status-${listingId}`}>
							<Select id={`edit-status-${listingId}`} bind:value={status} disabled={saving}>
								{#each statuses as label, value (value)}<option {value}>{label}</option>{/each}
							</Select>
						</Field>
						<Field label="Prix acheté (€)" id={`edit-purchase-${listingId}`}>
							<Input
								id={`edit-purchase-${listingId}`}
								type="number"
								min="0"
								step="0.01"
								required
								bind:value={purchasePrice}
								disabled={saving}
							/>
						</Field>
						<Field label="Frais de port d’achat (€)" id={`edit-shipping-${listingId}`}>
							<Input
								id={`edit-shipping-${listingId}`}
								type="number"
								min="0"
								step="0.01"
								required
								bind:value={shippingPrice}
								disabled={saving}
							/>
						</Field>
						<Field
							label={`Prix de mise en vente (€)${status >= 1 && status <= 5 ? ' *' : ''}`}
							id={`edit-listing-${listingId}`}
						>
							<Input
								id={`edit-listing-${listingId}`}
								type="number"
								min={status >= 1 && status <= 5 ? '0.01' : '0'}
								step="0.01"
								required={status >= 1 && status <= 5}
								bind:value={listingPrice}
								disabled={saving}
							/>
						</Field>
						<Field
							label={`Prix vendu (€)${status >= 2 && status <= 5 ? ' *' : ''}`}
							id={`edit-sale-${listingId}`}
						>
							<Input
								id={`edit-sale-${listingId}`}
								type="number"
								min={status >= 2 && status <= 5 ? '0.01' : '0'}
								step="0.01"
								required={status >= 2 && status <= 5}
								bind:value={salePrice}
								disabled={saving}
							/>
						</Field>
					</div>{/key}
				<ModelPhotos
					modelId={model.uuid}
					enabled={!!version && !loading && mode === 'edit'}
					bind:photos
					bind:cover
					bind:busy={modelPhotoBusy}
				/>
				{#key formKey}<PhotoPicker
						id={`edit-photos-${listingId}`}
						bind:busy={photoBusy}
						bind:photos
						bind:cover
						disabled={saving || modelPhotoBusy}
					/>{/key}
				{#if reference}<p class="text-sm text-fg-muted">
						Référence : <span class="font-mono font-semibold text-fg">{reference}</span>
					</p>{:else if status >= 2 && status <= 4}<p class="text-sm text-fg-muted">
						Une référence sera générée à l’enregistrement.
					</p>{/if}
				{#if validation}<p class="text-sm text-warning" role="status">{validation}</p>{/if}
			{/if}
			{#if errorMessage}<p class="text-sm text-danger" role="alert">{errorMessage}</p>{/if}
			<div class="flex justify-end gap-3">
				<Button variant="secondary" disabled={saving} onclick={() => dialog?.close()}
					>Annuler</Button
				>
				<Button
					type="submit"
					variant={mode === 'delete' ? 'danger' : 'primary'}
					disabled={saving || (mode === 'edit' && !!validation)}
					>{saving ? 'Enregistrement…' : mode === 'delete' ? 'Supprimer' : 'Enregistrer'}</Button
				>
			</div>
		</form>
	{:else}<p role="alert" class="mb-5 text-sm text-danger">{errorMessage}</p>
		<Button variant="secondary" onclick={() => dialog?.close()}>Fermer</Button>{/if}
</Dialog>
