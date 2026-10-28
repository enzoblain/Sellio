<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Props = HTMLButtonAttributes & {
		variant?: 'primary' | 'secondary' | 'ghost';
		children: Snippet;
	};

	let {
		variant = 'primary',
		type = 'button',
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const variants = {
		primary: 'bg-accent text-accent-fg hover:opacity-90',
		secondary: 'border border-border bg-surface text-fg hover:bg-surface-2',
		ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg'
	};
</script>

<button
	{type}
	class="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 {variants[
		variant
	]} {className}"
	{...rest}
>
	{@render children()}
</button>
