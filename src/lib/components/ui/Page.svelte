<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		wide = false,
		actions,
		children
	}: { title?: string; wide?: boolean; actions?: Snippet; children: Snippet } = $props();
</script>

<div class="mx-auto p-6 md:p-10 {wide ? 'max-w-none' : 'max-w-6xl'}">
	{#if title || actions}
		<header class="mb-6 flex items-center justify-between gap-4">
			{#if title}<h1 class="text-2xl text-fg">{title}</h1>{/if}
			{@render actions?.()}
		</header>
	{/if}
	{@render children()}
</div>
