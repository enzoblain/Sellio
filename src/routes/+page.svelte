<script lang="ts">
	import Autocomplete from '$lib/components/form/Autocomplete.svelte';
	import type { AutocompleteItem } from '$lib/components/form/Autocomplete.svelte.js';
	import { searchBrands } from '$lib/remote/brands.remote';

	let selectedBrandUuid = $state('');

	const query = async (
		search: string,
		offset: number,
		limit: number
	): Promise<AutocompleteItem[]> => {
		return searchBrands({
			search,
			offset,
			limit
		});
	};
</script>

<Autocomplete {query} limit={5} bind:value={selectedBrandUuid} />
