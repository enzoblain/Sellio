<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Props = Omit<HTMLButtonAttributes, 'aria-pressed'> & {
		selected?: boolean;
		children: Snippet;
	};

	let { selected = false, class: className = '', children, ...rest }: Props = $props();
</script>

<button
	type="button"
	aria-pressed={selected}
	class="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 md:min-h-9 {selected
		? 'border-accent bg-accent text-accent-fg'
		: 'border-border bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg'} {className}"
	{...rest}
>
	{@render children()}
</button>
