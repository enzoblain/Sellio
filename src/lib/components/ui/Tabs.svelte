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
		`flex min-h-11 shrink-0 items-center border-b-2 px-3 whitespace-nowrap md:px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
			selected ? 'border-accent text-fg' : 'border-transparent text-fg-muted hover:text-fg'
		}`;

	const uid = $props.id();
	let list = $state<HTMLElement>();
	let nav = $state<HTMLElement>();

	// Sur mobile la barre défile : l'onglet actif doit rester visible.
	$effect(() => {
		if (!nav || !value) return;
		const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
		if (!active) return;
		const left = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
		nav.scrollLeft = Math.max(0, left);
	});

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
	<nav
		bind:this={nav}
		aria-label={label}
		class="flex [scrollbar-width:none] gap-1 overflow-x-auto overflow-y-hidden border-b border-border [&::-webkit-scrollbar]:hidden"
	>
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
		class="flex [scrollbar-width:none] gap-1 overflow-x-auto overflow-y-hidden border-b border-border [&::-webkit-scrollbar]:hidden"
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
				class="min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:px-4 {selected
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
