<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Props = HTMLButtonAttributes & {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md';
		children: Snippet;
	};

	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const sizes = { sm: 'px-3 py-2', md: 'px-4 py-2' };

	const variants = {
		primary: 'bg-accent text-accent-fg hover:opacity-90',
		secondary: 'border border-border bg-surface text-fg hover:bg-surface-2',
		danger: 'bg-danger text-bg hover:opacity-90',
		ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg'
	};
</script>

<button
	{type}
	class="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 {sizes[
		size
	]} {variants[variant]} {className}"
	{...rest}
>
	{@render children()}
</button>
