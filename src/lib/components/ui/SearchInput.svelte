<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Icon from './Icon.svelte';

	type Props = Omit<HTMLInputAttributes, 'value' | 'type'> & {
		value?: string;
		'aria-label': string;
	};

	let { value = $bindable(''), class: className = '', ...rest }: Props = $props();
	let input = $state<HTMLInputElement>();

	function clear() {
		value = '';
		input?.focus();
	}
</script>

<div class="relative {className}">
	<span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-muted">
		<Icon name="search" />
	</span>
	<input
		bind:this={input}
		bind:value
		type="search"
		onkeydown={(event) => {
			if (event.key === 'Escape' && value) {
				event.preventDefault();
				clear();
			}
		}}
		class="min-h-11 w-full appearance-none rounded-md border border-border bg-surface py-2 pr-11 pl-10 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:ring-2 focus:ring-ring focus:outline-none [&::-webkit-search-cancel-button]:hidden"
		{...rest}
	/>
	{#if value}
		<button
			type="button"
			onclick={clear}
			aria-label="Effacer la recherche"
			class="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-md text-fg-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
		>
			<Icon name="close" class="h-4 w-4" />
		</button>
	{/if}
</div>
