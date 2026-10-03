<script lang="ts" module>
	type Article = {
		id: string;
		modelId: string;
		sizeId: string;
		colorId: string;
		brand: string;
		model: string;
		purchasePrice: number;
		shippingPrice: number;
		listingPrice?: number | null;
		salePrice?: number | null;
	};
</script>

<script lang="ts" generics="T extends Article">
	import type { Snippet } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';

	let { items, card, empty }: { items: T[]; card: Snippet<[T, Snippet]>; empty: Snippet } =
		$props();
	let expanded = $state<string[]>([]);
	const groups = $derived.by(() => {
		const map = new SvelteMap<string, T[]>();
		for (const item of items) {
			const key = `${item.modelId}:${item.sizeId}:${item.colorId}`;
			const group = map.get(key);
			if (group) group.push(item);
			else map.set(key, [item]);
		}
		return [...map].map(([key, articles]) => ({ key, articles }));
	});
	function toggle(key: string) {
		expanded = expanded.includes(key)
			? expanded.filter((value) => value !== key)
			: [...expanded, key];
	}
</script>

<div class="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
	{#each groups as group (group.key)}
		{@const multiple = group.articles.length > 1}
		{@const open = expanded.includes(group.key)}
		<section class:col-span-full={multiple && open} class="min-w-0">
			{#snippet stackButton()}
				{#if multiple}
					<button
						type="button"
						onclick={() => toggle(group.key)}
						aria-expanded={open}
						aria-controls={`stack-${group.articles[0].id}`}
						aria-label={`${open ? 'Replier' : 'Déplier'} les ${group.articles.length} articles`}
						title={open ? 'Replier la pile' : 'Déplier la pile'}
						class="rounded-lg border border-violet-200 bg-white px-2.5 py-2 text-sm font-medium text-violet-950 shadow-sm transition hover:bg-violet-50"
					>
						<span aria-hidden="true">▱ {group.articles.length} {open ? '↑' : '↓'}</span>
					</button>
				{/if}
			{/snippet}
			<div
				id={`stack-${group.articles[0].id}`}
				class="relative isolate"
				class:stacked={multiple && !open}
			>
				<div
					class="relative z-10"
					class:grid={multiple && open}
					class:grid-cols-1={multiple && open}
					class:gap-5={multiple && open}
					class:sm:grid-cols-2={multiple && open}
					class:xl:grid-cols-3={multiple && open}
					class:2xl:grid-cols-4={multiple && open}
				>
					{#each open ? group.articles : group.articles.slice(0, 1) as item (item.id)}
						<div class="min-w-0">{@render card(item, stackButton)}</div>
					{/each}
				</div>
			</div>
		</section>
	{:else}
		{@render empty()}
	{/each}
</div>

<style>
	.stacked::before,
	.stacked::after {
		content: '';
		position: absolute;
		inset: 0;
		border: 1px solid #ddd6fe;
		border-radius: 0.75rem;
		background: #ede9fe;
		pointer-events: none;
	}
	.stacked::before {
		transform: translate(8px, 12px);
		z-index: -2;
	}
	.stacked::after {
		transform: translate(4px, 6px);
		z-index: -1;
		background: #f5f3ff;
	}
</style>
