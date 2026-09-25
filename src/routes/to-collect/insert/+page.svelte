<script lang="ts">
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

	let previousBrandId = $state<string | null>(null);

	const isValid = $derived(
		selectedBrand.value !== null &&
			selectedModel.value !== null &&
			selectedSize.value !== null &&
			selectedColor.value !== null &&
			price !== undefined &&
			shippingCost !== undefined
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
		if (!isValid) return;

		try {
			await createListing({
				brand: selectedBrand,
				model: selectedModel,
				size: selectedSize,
				color: selectedColor,
				purchasePrice: price!,
				shippingPrice: shippingCost!
			});
		} catch (error) {
			console.error('createListing error:', error);
		}
	}
</script>

<form
	onsubmit={(event) => {
		event.preventDefault();
		confirm();
	}}
>
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

	<button
		type="submit"
		disabled={!isValid}
		class="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
	>
		Confirmer
	</button>
</form>
