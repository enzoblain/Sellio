<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';

	let {
		items,
		key,
		label,
		row,
		empty
	}: {
		items: T[];
		key: (item: T) => string | number;
		label: string;
		row: Snippet<[T]>;
		empty?: Snippet;
	} = $props();
</script>

{#if items.length === 0 && empty}
	{@render empty()}
{:else}
	<ul
		aria-label={label}
		class="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface"
	>
		{#each items as item (key(item))}
			<li class="flex min-h-11 items-center gap-3 px-4 py-3 text-sm">
				{@render row(item)}
			</li>
		{/each}
	</ul>
{/if}
