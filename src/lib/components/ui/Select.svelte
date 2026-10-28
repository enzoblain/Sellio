<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';

	let {
		value = $bindable(),
		class: className = '',
		children,
		...rest
	}: HTMLSelectAttributes = $props();
</script>

<select
	bind:value
	class="w-full rounded-md border border-border bg-surface px-4 py-2 text-fg focus:border-accent focus:ring-2 focus:ring-ring focus:outline-none disabled:opacity-50 aria-[invalid=true]:border-danger {className}"
	{...rest}
>
	{@render children?.()}
</select>
