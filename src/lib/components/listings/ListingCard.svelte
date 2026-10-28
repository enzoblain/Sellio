<script lang="ts">
	import type { Snippet } from 'svelte';
	import ListingGallery from '$lib/components/images/ListingGallery.svelte';
	import ListingEditor from './ListingEditor.svelte';

	let {
		item,
		action,
		stackButton,
		children,
		footer,
		extra
	}: {
		item: { id: string; brand: string; model: string };
		action?: Snippet;
		stackButton: Snippet;
		children: Snippet;
		footer?: Snippet;
		extra?: Snippet;
	} = $props();
</script>

<article class="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
	<div class="relative flex aspect-square items-center justify-center bg-surface-2">
		<ListingEditor listingId={item.id} />
		<ListingGallery listingId={item.id} brand={item.brand} model={item.model} />
		<div class="absolute top-3 right-3 flex items-center gap-2">
			{@render action?.()}
			{@render stackButton()}
		</div>
	</div>
	<div class="px-4 py-3">
		{@render children()}
	</div>
	{#if footer}
		<div
			class="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-2 px-4 py-3"
		>
			{@render footer()}
		</div>
	{/if}
	{#if extra}
		<div class="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
			{@render extra()}
		</div>
	{/if}
</article>
