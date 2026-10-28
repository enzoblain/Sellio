<script lang="ts">
	import ModelPhotos from '$lib/components/images/ModelPhotos.svelte';
	import PhotoPicker from '$lib/components/images/PhotoPicker.svelte';
	import { photoForm, type PhotoDraft } from '$lib/components/images/photo-draft';
	import { refreshListingViews } from '$lib/components/listings/refresh-views';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Page from '$lib/components/ui/Page.svelte';
	import Autocomplete from '$lib/components/form/Autocomplete.svelte';
	import type { AutocompleteItem } from '$lib/components/form/Autocomplete.svelte.js';

	import { createListing } from '$lib/remote/listings.remote';
	import { searchBrands } from '$lib/remote/brands.remote';
	import { searchModels } from '$lib/remote/models.remote';
	import { searchSizes } from '$lib/remote/sizes.remote';
	import { searchColors } from '$lib/remote/colors.remote';

	let selectedBrand = $state<AutocompleteItem>({ value: '', uuid: null });
	let selectedModel = $state<AutocompleteItem>({ value: '', uuid: null });
	let selectedSize = $state<AutocompleteItem>({ value: '', uuid: null });
	let selectedColor = $state<AutocompleteItem>({ value: '', uuid: null });

	let price = $state<number | undefined>(undefined);
	let shippingCost = $state<number | undefined>(undefined);

	let saving = $state(false);
	let errorMessage = $state('');
	let photos = $state<PhotoDraft[]>([]);
	let cover = $state<string | null>(null);
	let photoBusy = $state(false);
	let modelPhotoBusy = $state(false);
	let createdId = $state<string | null>(null);

	let previousBrandId = $state<string | null>(null);

	const isValid = $derived(
		!photoBusy &&
			!modelPhotoBusy &&
			selectedBrand.value.trim().length > 0 &&
			selectedModel.value.trim().length > 0 &&
			selectedSize.value.trim().length > 0 &&
			selectedColor.value.trim().length > 0 &&
			price !== undefined &&
			price >= 0 &&
			shippingCost !== undefined &&
			shippingCost >= 0
	);

	const brandQuery = (search: string, offset: number, limit: number) =>
		searchBrands({ search, offset, limit });

	const modelQuery = (search: string, offset: number, limit: number) => {
		if (!selectedBrand.uuid) return Promise.resolve([]);

		return searchModels({
			search,
			brandId: selectedBrand.uuid,
			offset,
			limit
		});
	};

	const sizeQuery = (search: string, offset: number, limit: number) =>
		searchSizes({ search, offset, limit });

	const colorQuery = (search: string, offset: number, limit: number) =>
		searchColors({ search, offset, limit });

	$effect(() => {
		const brandId = selectedBrand.uuid;

		if (brandId !== previousBrandId) {
			previousBrandId = brandId;
			selectedModel = { value: '', uuid: null };
		}
	});

	async function confirm() {
		if (!isValid || saving) return;
		saving = true;
		errorMessage = '';

		try {
			if (!createdId) {
				const listing = await createListing({
					brand: selectedBrand,
					model: selectedModel,
					size: selectedSize,
					color: selectedColor,
					purchasePrice: price!,
					shippingPrice: shippingCost!
				});
				createdId = listing.id;
			}
			if (photos.length) {
				const response = await fetch(resolve('/api/listings/[id]/images', { id: createdId }), {
					method: 'POST',
					body: photoForm(photos, cover)
				});
				const result = await response.json();
				if (!result.ok) {
					errorMessage = `L’article est enregistré, mais les photos n’ont pas été ajoutées : ${result.error}`;
					return;
				}
			}
			await refreshListingViews(createdId);
			await goto(resolve('/to-collect'));
		} catch {
			errorMessage = createdId
				? 'L’article est enregistré. Réessaie d’envoyer les photos.'
				: 'Impossible d’ajouter l’article. Réessaie.';
		} finally {
			saving = false;
		}
	}
</script>

<Page title="Ajouter un article">
	<Card class="max-w-2xl">
		<form
			class="space-y-5"
			onsubmit={(event) => {
				event.preventDefault();
				confirm();
			}}
		>
			<fieldset disabled={saving || !!createdId} class="space-y-4">
				<Field label="Marque" id="brand">
					<Autocomplete id="brand" query={brandQuery} limit={5} bind:model={selectedBrand} />
				</Field>
				<Field label="Modèle" id="model">
					<Autocomplete
						id="model"
						query={modelQuery}
						limit={5}
						bind:model={selectedModel}
						disabled={!selectedBrand.value}
					/>
				</Field>
				<Field label="Taille" id="size">
					<Autocomplete id="size" query={sizeQuery} limit={5} bind:model={selectedSize} />
				</Field>
				<Field label="Couleur" id="color">
					<Autocomplete id="color" query={colorQuery} limit={5} bind:model={selectedColor} />
				</Field>
				<Field label="Prix de l'article" id="price">
					<div class="relative">
						<Input
							id="price"
							type="number"
							min="0"
							step="0.01"
							bind:value={price}
							placeholder="0,00"
							class="pr-10"
						/>
						<span class="absolute top-1/2 right-4 -translate-y-1/2 text-fg-muted">€</span>
					</div>
				</Field>
				<Field label="Frais de port" id="shipping-cost">
					<div class="relative">
						<Input
							id="shipping-cost"
							type="number"
							min="0"
							step="0.01"
							bind:value={shippingCost}
							placeholder="0,00"
							class="pr-10"
						/>
						<span class="absolute top-1/2 right-4 -translate-y-1/2 text-fg-muted">€</span>
					</div>
				</Field>
			</fieldset>
			<ModelPhotos
				modelId={selectedModel.uuid}
				enabled={!createdId}
				bind:photos
				bind:cover
				bind:busy={modelPhotoBusy}
			/>
			<PhotoPicker
				id="new-article-photos"
				bind:photos
				bind:cover
				bind:busy={photoBusy}
				disabled={saving || modelPhotoBusy}
			/>
			{#if errorMessage}<p role="alert" class="text-sm text-danger">{errorMessage}</p>{/if}
			<Button type="submit" class="w-full" disabled={!isValid || saving}>
				{saving ? 'Ajout en cours…' : 'Confirmer'}
			</Button>
		</form>
	</Card>
</Page>
