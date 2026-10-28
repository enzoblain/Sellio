<script lang="ts">
	import type { Snippet } from 'svelte';

	type Tab = { id: string; label: string };

	let {
		tabs,
		value = $bindable(tabs[0]?.id ?? ''),
		label,
		children
	}: {
		tabs: Tab[];
		value?: string;
		label: string;
		children?: Snippet<[string]>;
	} = $props();

	const uid = $props.id();
	let list = $state<HTMLElement>();

	function select(id: string) {
		value = id;
	}

	function onkeydown(event: KeyboardEvent) {
		const index = tabs.findIndex((tab) => tab.id === value);
		let next: number;
		if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
		else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = tabs.length - 1;
		else return;
		event.preventDefault();
		select(tabs[next].id);
		list?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
	}
</script>

<div
	bind:this={list}
	role="tablist"
	aria-label={label}
	tabindex="-1"
	{onkeydown}
	class="flex gap-1 border-b border-border"
>
	{#each tabs as tab (tab.id)}
		{@const selected = tab.id === value}
		<button
			type="button"
			role="tab"
			id="{uid}-tab-{tab.id}"
			aria-selected={selected}
			aria-controls="{uid}-panel-{tab.id}"
			tabindex={selected ? 0 : -1}
			onclick={() => select(tab.id)}
			class="-mb-px min-h-11 border-b-2 px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {selected
				? 'border-accent text-fg'
				: 'border-transparent text-fg-muted hover:text-fg'}"
		>
			{tab.label}
		</button>
	{/each}
</div>
{#if children}
	<div
		role="tabpanel"
		id="{uid}-panel-{value}"
		aria-labelledby="{uid}-tab-{value}"
		tabindex="0"
		class="pt-4 focus-visible:outline-none"
	>
		{@render children(value)}
	</div>
{/if}
