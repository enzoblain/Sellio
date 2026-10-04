<script lang="ts">
	import ModelPhotos from '$lib/components/images/ModelPhotos.svelte';
	import PhotoPicker from '$lib/components/images/PhotoPicker.svelte';
	import { photoForm, type PhotoDraft } from '$lib/components/images/photo-draft';
	import { refreshListingViews } from '$lib/components/listings/refresh-views';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
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

<div class="min-h-screen bg-gray-50 px-6 py-6">
	<h1 class="mb-6 text-xl font-semibold text-violet-950">Ajouter un article</h1>
	<form
		class="max-w-2xl space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
		onsubmit={(event) => {
			event.preventDefault();
			confirm();
		}}
	>
		<fieldset disabled={saving || !!createdId} class="space-y-4">
			<div>
				<label for="brand">Marque</label>
				<Autocomplete id="brand" query={brandQuery} limit={5} bind:model={selectedBrand} />
			</div>

			<div>
				<label for="model">Modèle</label>
				<Autocomplete
					id="model"
					query={modelQuery}
					limit={5}
					bind:model={selectedModel}
					disabled={!selectedBrand.value}
				/>
			</div>

			<div>
				<label for="size">Taille</label>
				<Autocomplete id="size" query={sizeQuery} limit={5} bind:model={selectedSize} />
			</div>

			<div>
				<label for="color">Couleur</label>
				<Autocomplete id="color" query={colorQuery} limit={5} bind:model={selectedColor} />
			</div>

			<div>
				<label for="price">Prix de l'article</label>
				<div class="relative">
					<input
						id="price"
						type="number"
						min="0"
						step="0.01"
						bind:value={price}
						placeholder="0,00"
						class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
					/>
					<span class="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400">€</span>
				</div>
			</div>

			<div>
				<label for="shipping-cost">Frais de port</label>
				<div class="relative">
					<input
						id="shipping-cost"
						type="number"
						min="0"
						step="0.01"
						bind:value={shippingCost}
						placeholder="0,00"
						class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
					/>
					<span class="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400">€</span>
				</div>
			</div>
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
		{#if errorMessage}<p role="alert" class="text-sm text-red-600">{errorMessage}</p>{/if}
		<button
			type="submit"
			disabled={!isValid || saving}
			class="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
		>
			{saving ? 'Ajout en cours…' : 'Confirmer'}
		</button>
	</form>
</div>
