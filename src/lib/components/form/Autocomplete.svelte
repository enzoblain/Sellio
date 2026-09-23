<script lang="ts">
	import { createAutocomplete, type AutocompleteItem } from './Autocomplete.svelte.js';

	let {
		query,
		limit = 5,
		debounce = 100,
		model = $bindable<AutocompleteItem>({ value: '', uuid: null })
	}: {
		query: (search: string, offset: number, limit: number) => Promise<AutocompleteItem[]>;
		limit?: number;
		debounce?: number;
		model?: AutocompleteItem;
	} = $props();

	const { state, oninput, onfocus, onscroll, additem, selectitem } = createAutocomplete(
		() => query,
		() => limit,
		() => debounce,
		(newModel) => (model = newModel)
	);

	$effect(() => {
		if (state.value !== model.value) {
			state.value = model.value;
		}
	});

	const ITEM_HEIGHT = 40;
	const maxHeight = $derived(limit * ITEM_HEIGHT - ITEM_HEIGHT / 2);
</script>

<div class="w-full max-w-md">
	<div class="relative">
		<input
			bind:value={state.value}
			{oninput}
			{onfocus}
			class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
			placeholder="Rechercher..."
		/>

		{#if state.focused}
			<ul
				{onscroll}
				style:max-height={`${maxHeight}px`}
				class="absolute z-10 mt-1 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
			>
				{#if state.value.trim()}
					<li style:height={`${ITEM_HEIGHT}px`} class="border-b border-gray-100">
						<button
							type="button"
							class="h-full w-full cursor-pointer px-4 text-left font-medium text-blue-600 hover:bg-blue-50"
							onmousedown={() => additem()}
						>
							Ajouter « {state.value} »
						</button>
					</li>
				{/if}

				{#if state.loading && state.items.length === 0}
					<li style:height={`${ITEM_HEIGHT}px`} class="flex items-center px-4 text-gray-400">
						Chargement...
					</li>
				{:else if state.items.length === 0}
					<li style:height={`${ITEM_HEIGHT}px`} class="flex items-center px-4 text-gray-500">
						Aucun résultat trouvé
					</li>
				{:else}
					{#each state.items as item}
						<li style:height={`${ITEM_HEIGHT}px`}>
							<button
								type="button"
								class="h-full w-full cursor-pointer px-4 text-left hover:bg-gray-100"
								onmousedown={() => selectitem(item)}
							>
								{item.value}
							</button>
						</li>
					{/each}

					{#if state.loading}
						<li
							style:height={`${ITEM_HEIGHT}px`}
							class="flex items-center justify-center text-xs text-gray-400"
						>
							Chargement de la suite...
						</li>
					{/if}
				{/if}
			</ul>
		{/if}
	</div>
</div>
