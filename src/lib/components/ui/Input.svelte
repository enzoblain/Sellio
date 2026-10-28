<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		value = $bindable(),
		class: className = '',
		...rest
	}: Omit<HTMLInputAttributes, 'value'> & { value?: string | number | null } = $props();
</script>

<input
	bind:value
	class="w-full rounded-md border border-border bg-surface px-4 py-2 text-fg placeholder:text-fg-muted focus:border-accent focus:ring-2 focus:ring-ring focus:outline-none disabled:opacity-50 aria-[invalid=true]:border-danger {className}"
	{...rest}
/>
