<script lang="ts">
	// Support de test : remplace Autocomplete (saisie libre, sans requête) dans les tests de page.
	import type { AutocompleteItem } from './Autocomplete.svelte.js';
	let {
		id,
		disabled = false,
		model = $bindable<AutocompleteItem>({ value: '', uuid: null })
	}: { id?: string; disabled?: boolean; model?: AutocompleteItem } = $props();
</script>

<input
	{id}
	{disabled}
	value={model.value}
	oninput={(event) => (model = { value: event.currentTarget.value, uuid: null })}
/>
