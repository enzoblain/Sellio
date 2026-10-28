<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { euros } from '$lib/format';
	import Autocomplete from '$lib/components/form/Autocomplete.svelte';
	import type { AutocompleteItem } from '$lib/components/form/Autocomplete.svelte.js';
	import { searchBrands } from '$lib/remote/brands.remote';
	import { searchModels } from '$lib/remote/models.remote';
	import { searchSizes } from '$lib/remote/sizes.remote';
	import { searchColors } from '$lib/remote/colors.remote';
	import { totalCents } from './insert-total';

	let {
		brand = $bindable(),
		model = $bindable(),
		size = $bindable(),
		color = $bindable(),
		price = $bindable(),
		shippingCost = $bindable(),
		idPrefix = ''
	}: {
		brand: AutocompleteItem;
		model: AutocompleteItem;
		size: AutocompleteItem;
		color: AutocompleteItem;
		price: number | undefined;
		shippingCost: number | undefined;
		/** Préfixe des id, pour que deux formulaires puissent coexister dans la page. */
		idPrefix?: string;
	} = $props();

	const total = $derived(totalCents(price, shippingCost));
	let previousBrandId = $state<string | null>(brand.uuid);

	const brandQuery = (search: string, offset: number, limit: number) =>
		searchBrands({ search, offset, limit });

	const modelQuery = (search: string, offset: number, limit: number) => {
		if (!brand.uuid) return Promise.resolve([]);
		return searchModels({ search, brandId: brand.uuid, offset, limit });
	};

	const sizeQuery = (search: string, offset: number, limit: number) =>
		searchSizes({ search, offset, limit });

	const colorQuery = (search: string, offset: number, limit: number) =>
		searchColors({ search, offset, limit });

	$effect(() => {
		const brandId = brand.uuid;
		if (brandId !== previousBrandId) {
			previousBrandId = brandId;
			model = { value: '', uuid: null };
		}
	});
</script>

<Card class="space-y-4">
	<h2 class="text-base font-medium text-fg">Article</h2>
	<Field label="Marque" id="{idPrefix}brand">
		<Autocomplete id="{idPrefix}brand" query={brandQuery} limit={5} bind:model={brand} />
	</Field>
	<Field label="Modèle" id="{idPrefix}model">
		<Autocomplete
			id="{idPrefix}model"
			query={modelQuery}
			limit={5}
			bind:model
			disabled={!brand.value}
		/>
	</Field>
	<div class="grid gap-4 sm:grid-cols-2">
		<Field label="Taille" id="{idPrefix}size">
			<Autocomplete id="{idPrefix}size" query={sizeQuery} limit={5} bind:model={size} />
		</Field>
		<Field label="Couleur" id="{idPrefix}color">
			<Autocomplete id="{idPrefix}color" query={colorQuery} limit={5} bind:model={color} />
		</Field>
	</div>
</Card>
<Card class="space-y-4">
	<h2 class="text-base font-medium text-fg">Coût</h2>
	<div class="grid gap-4 sm:grid-cols-2">
		<Field label="Prix de l'article" id="{idPrefix}price">
			<div class="relative">
				<Input
					id="{idPrefix}price"
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
		<Field label="Frais de port" id="{idPrefix}shipping-cost">
			<div class="relative">
				<Input
					id="{idPrefix}shipping-cost"
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
	</div>
	<p class="flex items-center justify-between text-sm text-fg-muted">
		Total <strong class="text-base text-fg" data-testid="total">{euros(total)}</strong>
	</p>
</Card>
