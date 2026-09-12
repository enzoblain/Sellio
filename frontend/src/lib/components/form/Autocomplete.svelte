<script lang="ts">
	import { createAutocomplete } from './Autocomplete.svelte.js';

	let {
		endpoint,
		limit = 5
	}: {
		endpoint: string;
		limit?: number;
	} = $props();

	const { state, oninput, onfocus, onscroll, additem, selectitem } = createAutocomplete(
		() => endpoint,
		() => limit
	);

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
				style="max-height: {maxHeight}px"
				class="absolute z-10 mt-1 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
			>
				{#if state.value.trim()}
					<li class="border-b border-gray-100">
						<button
							type="button"
							class="w-full cursor-pointer px-4 py-2 text-left font-medium text-blue-600 hover:bg-blue-50"
							onmousedown={() => additem()}
						>
							Ajouter « {state.value} »
						</button>
					</li>
				{/if}

				{#if state.loading && state.items.length === 0}
					<li class="px-4 py-2 text-gray-400">Chargement...</li>
				{:else if state.items.length === 0}
					<li class="px-4 py-2 text-gray-500">Aucun résultat trouvé</li>
				{:else}
					{#each state.items as item}
						<li>
							<button
								type="button"
								class="w-full cursor-pointer px-4 py-2 text-left hover:bg-gray-100"
								onmousedown={() => selectitem(item)}
							>
								{item}
							</button>
						</li>
					{/each}

					{#if state.loading}
						<li class="px-4 py-2 text-center text-xs text-gray-400">Chargement de la suite...</li>
					{/if}
				{/if}
			</ul>
		{/if}
	</div>
</div>
