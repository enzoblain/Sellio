<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<p
	class="col-span-full rounded-lg border border-dashed border-border p-10 text-center text-sm text-fg-muted"
>
	{@render children()}
</p>
