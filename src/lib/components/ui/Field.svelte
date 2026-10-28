<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		id,
		error,
		children
	}: { label: string; id: string; error?: string; children: Snippet } = $props();
</script>

<div>
	<label for={id} class="mb-2 block text-sm font-medium text-fg">{label}</label>
	{@render children()}
	{#if error}<p id="{id}-error" role="alert" class="mt-1.5 text-sm text-danger">{error}</p>{/if}
</div>
