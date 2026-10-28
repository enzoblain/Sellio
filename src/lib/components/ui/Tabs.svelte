<script lang="ts">
	import type { Snippet } from 'svelte';

	type Tab = { id: string; label: string; href?: string };

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

	// Mode navigation : chaque onglet est une route, l'actif est donné par `value`.
	const navigation = $derived(tabs.length > 0 && tabs.every((tab) => tab.href !== undefined));
	const tabClass = (selected: boolean) =>
		`-mb-px flex min-h-11 items-center border-b-2 px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
			selected ? 'border-accent text-fg' : 'border-transparent text-fg-muted hover:text-fg'
		}`;

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

{#if navigation}
	<nav aria-label={label} class="flex gap-1 border-b border-border">
		{#each tabs as tab (tab.id)}
			{@const selected = tab.id === value}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- href déjà résolu par l'appelant -->
			<a href={tab.href} aria-current={selected ? 'page' : undefined} class={tabClass(selected)}>
				{tab.label}
			</a>
		{/each}
	</nav>
	{#if children}
		<div class="pt-4">{@render children(value)}</div>
	{/if}
{:else}
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
{/if}
