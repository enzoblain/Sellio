<script lang="ts">
	import type { Snippet } from 'svelte';
	import ListingGallery from '$lib/components/images/ListingGallery.svelte';

	let {
		item,
		action,
		stackButton,
		children,
		footer,
		extra,
		onopen
	}: {
		item: { id: string; brand: string; model: string };
		action?: Snippet;
		stackButton: Snippet;
		children: Snippet;
		footer?: Snippet;
		extra?: Snippet;
		/** Ouvre le panneau de détail de l'article. */
		onopen: () => void;
	} = $props();
</script>

<article class="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
	<!-- Clic souris sur la photo ; au clavier, le titre (bouton) joue ce rôle. -->
	<div
		class="relative flex aspect-square cursor-pointer items-center justify-center bg-surface-2"
		role="presentation"
		onclick={(event) => {
			if (!(event.target as HTMLElement).closest('button')) onopen();
		}}
	>
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
