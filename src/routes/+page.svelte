<script lang="ts">
	import Autocomplete from '$lib/components/form/Autocomplete.svelte';
	import type { AutocompleteItem } from '$lib/components/form/Autocomplete.svelte.js';
	import { searchBrands } from '$lib/remote/brands.remote';

	let selectedBrand = $state<AutocompleteItem>({ value: '', uuid: null });

	const query = async (search: string, offset: number, limit: number) => {
		return searchBrands({
			search,
			offset,
			limit
		});
	};
</script>

<Autocomplete {query} limit={5} bind:model={selectedBrand} />
