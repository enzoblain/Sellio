<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Common = {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md';
		children: Snippet;
	};
	type Props =
		| (HTMLButtonAttributes & Common & { href?: undefined })
		| (HTMLAnchorAttributes & Common & { href: string });

	let {
		variant = 'primary',
		size = 'md',
		href,
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const base =
		'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

	const sizes = { sm: 'px-3 py-2', md: 'px-4 py-2' };

	const variants = {
		primary: 'bg-accent text-accent-fg hover:opacity-90',
		secondary: 'border border-border bg-surface text-fg hover:bg-surface-2',
		danger: 'bg-danger text-bg hover:opacity-90',
		ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg'
	};
</script>

{#snippet content()}
	{@render children()}
{/snippet}

{#if href !== undefined}
	<!-- eslint-disable svelte/no-navigation-without-resolve -- href déjà résolu par l'appelant -->
	<a
		{href}
		class="{base} {sizes[size]} {variants[variant]} {className}"
		{...rest as HTMLAnchorAttributes}
	>
		{@render content()}
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{:else}
	<button
		type="button"
		class="{base} {sizes[size]} {variants[
			variant
		]} disabled:cursor-not-allowed disabled:opacity-40 {className}"
		{...rest as HTMLButtonAttributes}
	>
		{@render content()}
	</button>
{/if}
