<script lang="ts">
	import Autocomplete from '$lib/components/form/Autocomplete.svelte';
	import type { AutocompleteItem } from '$lib/components/form/Autocomplete.svelte.js';

	let selectedBrandUuid = $state('');

	const query = async (
		search: string,
		offset: number,
		limit: number
	): Promise<AutocompleteItem[]> => {
		const params = new URLSearchParams({
			search,
			offset: String(offset),
			limit: String(limit)
		});

		const response = await fetch(`/api/brands?${params}`);

		if (!response.ok) {
			throw new Error('Erreur lors de la recherche des marques');
		}

		return response.json();
	};
</script>

<Autocomplete {query} limit={5} bind:value={selectedBrandUuid} />
