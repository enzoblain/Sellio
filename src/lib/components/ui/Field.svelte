<script lang="ts">
	import type { Snippet } from 'svelte';

	type Aria = { 'aria-describedby'?: string; 'aria-invalid'?: true };

	let {
		label,
		id,
		error,
		children
	}: { label: string; id: string; error?: string; children: Snippet<[Aria]> } = $props();
</script>

<div>
	<label for={id} class="mb-2 block text-sm font-medium text-fg">{label}</label>
	{@render children({
		'aria-describedby': error ? `${id}-error` : undefined,
		'aria-invalid': error ? true : undefined
	})}
	{#if error}<p id="{id}-error" role="alert" class="mt-1.5 text-sm text-danger">{error}</p>{/if}
</div>
