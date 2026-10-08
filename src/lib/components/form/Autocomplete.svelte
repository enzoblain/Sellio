<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { createAutocomplete, type AutocompleteItem } from './Autocomplete.svelte.js';

	let {
		id,
		query,
		limit = 5,
		debounce = 100,
		disabled = false,
		model = $bindable<AutocompleteItem>({ value: '', uuid: null })
	}: {
		id?: string;
		query: (search: string, offset: number, limit: number) => Promise<AutocompleteItem[]>;
		limit?: number;
		debounce?: number;
		disabled?: boolean;
		model?: AutocompleteItem;
	} = $props();

	const {
		state,
		oninput,
		onfocus,
		onscroll,
		additem,
		selectitem,
		destroy,
		canAdd,
		close,
		onkeydown
	} = createAutocomplete(
		() => query,
		() => limit,
		() => debounce,
		(newModel) => (model = newModel)
	);

	onDestroy(destroy);
	$effect(() => {
		const value = model.value;
		untrack(() => {
			if (state.value !== value) state.value = value;
		});
	});

	const instanceId = $props.id();
	const listId = `${instanceId}-suggestions`;
	$effect(() => {
		const active = state.activeIndex;
		if (state.focused && active >= 0) {
			document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
		}
	});
	const ITEM_HEIGHT = 40;
	const maxHeight = $derived(limit * ITEM_HEIGHT - ITEM_HEIGHT / 2);
</script>

<div class="w-full max-w-md">
	<div class="relative">
		<input
			{id}
			bind:value={state.value}
			{disabled}
			{oninput}
			{onfocus}
			{onkeydown}
			onblur={close}
			role="combobox"
			aria-autocomplete="list"
			aria-expanded={state.focused && !disabled}
			aria-controls={listId}
			aria-activedescendant={state.focused && state.activeIndex >= 0
				? `${listId}-${state.activeIndex}`
				: undefined}
			autocomplete="off"
			class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
			placeholder="Rechercher..."
		/>

		{#if state.focused && !disabled}
			<ul
				id={listId}
				role="listbox"
				{onscroll}
				style:max-height={`${maxHeight}px`}
				class="absolute z-10 mt-1 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
			>
				{#if canAdd()}
					<li
						id={`${listId}-0`}
						role="option"
						aria-selected={state.activeIndex === 0}
						style:height={`${ITEM_HEIGHT}px`}
						class="border-b border-gray-100"
						class:bg-blue-50={state.activeIndex === 0}
					>
						<button
							type="button"
							class="h-full w-full cursor-pointer px-4 text-left font-medium text-blue-600 hover:bg-blue-50"
							tabindex="-1"
							onmousedown={(event) => event.preventDefault()}
							onclick={additem}
						>
							Ajouter « {state.value} »
						</button>
					</li>
				{/if}

				{#if state.loading && state.items.length === 0}
					<li style:height={`${ITEM_HEIGHT}px`} class="flex items-center px-4 text-gray-400">
						Chargement...
					</li>
				{:else if state.error}
					<li class="px-4 py-3 text-sm text-red-600" role="status">{state.error}</li>
				{:else if state.items.length === 0}
					<li style:height={`${ITEM_HEIGHT}px`} class="flex items-center px-4 text-gray-500">
						Aucun résultat trouvé
					</li>
				{:else}
					{#each state.items as item, index (item.uuid ?? item.value)}
						{@const optionIndex = index + (canAdd() ? 1 : 0)}
						<li
							id={`${listId}-${optionIndex}`}
							role="option"
							aria-selected={state.activeIndex === optionIndex}
							style:height={`${ITEM_HEIGHT}px`}
							class:bg-gray-100={state.activeIndex === optionIndex}
						>
							<button
								type="button"
								class="h-full w-full cursor-pointer px-4 text-left hover:bg-gray-100"
								tabindex="-1"
								onmousedown={(event) => event.preventDefault()}
								onclick={() => selectitem(item)}
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
