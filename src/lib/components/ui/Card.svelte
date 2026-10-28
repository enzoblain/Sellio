<script lang="ts">
	import type { Snippet } from 'svelte';

	let { class: className = '', children }: { class?: string; children: Snippet } = $props();
</script>

<div class="rounded-lg border border-border bg-surface p-5 shadow-sm md:p-6 {className}">
	{@render children()}
</div>
