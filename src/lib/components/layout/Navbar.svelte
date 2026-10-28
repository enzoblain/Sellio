<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';
	import { DARK_MODE_ENABLED } from '$lib/theme';
	import { isActive, navItems, NEW_ARTICLE_HREF } from './nav';
	import { restoreSidebar, sidebar, toggleSidebar } from './sidebar.svelte';

	onMount(restoreSidebar);

	const labelClass = $derived(sidebar.collapsed ? 'sr-only' : '');
</script>

<nav
	aria-label="Navigation principale"
	class="fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-border bg-surface px-3 py-6 transition-[width] duration-150 md:flex {sidebar.collapsed
		? 'w-16'
		: 'w-60'}"
>
	<div
		class="mb-6 flex items-center {sidebar.collapsed ? 'justify-center' : 'justify-between px-3'}"
	>
		{#if !sidebar.collapsed}
			<span class="text-base font-semibold tracking-tight text-fg">Sellio</span>
		{/if}
		<button
			type="button"
			onclick={toggleSidebar}
			aria-label={sidebar.collapsed ? 'Déplier la barre latérale' : 'Replier la barre latérale'}
			aria-expanded={!sidebar.collapsed}
			class="flex items-center justify-center rounded-md p-2 text-fg-muted transition hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
		>
			<Icon name={sidebar.collapsed ? 'chevronRight' : 'chevronLeft'} />
		</button>
	</div>

	<a
		href={resolve(NEW_ARTICLE_HREF)}
		aria-label={sidebar.collapsed ? 'Nouvel article' : undefined}
		class="mb-6 flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
	>
		<Icon name="plus" />
		{#if !sidebar.collapsed}Nouvel article{/if}
	</a>

	<ul class="flex flex-1 flex-col gap-0.5">
		{#each navItems as item (item.href)}
			{@const active = isActive(item, page.url.pathname)}
			<li class="relative">
				{#if active}
					<span class="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent"
					></span>
				{/if}
				<a
					href={resolve(item.href)}
					aria-current={active ? 'page' : undefined}
					title={sidebar.collapsed ? item.label : undefined}
					class="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150 {sidebar.collapsed
						? 'justify-center'
						: ''} {active
						? 'bg-surface-2 text-fg'
						: 'text-fg-muted hover:bg-surface-2 hover:text-fg'}"
				>
					<Icon name={item.icon} />
					<span class={labelClass}>{item.label}</span>
				</a>
			</li>
		{/each}
	</ul>

	{#if DARK_MODE_ENABLED}
		<div class="flex {sidebar.collapsed ? 'justify-center' : 'px-3'}"><ThemeToggle /></div>
	{/if}
</nav>

{#if DARK_MODE_ENABLED}
	<div class="flex items-center justify-between px-6 pt-3 md:hidden">
		<span class="text-base font-semibold tracking-tight text-fg">Sellio</span>
		<ThemeToggle />
	</div>
{/if}

<nav
	aria-label="Navigation principale"
	class="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 items-stretch border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur md:hidden"
>
	{#each navItems.slice(0, 2) as item (item.href)}
		{@render tab(item)}
	{/each}
	<a
		href={resolve(NEW_ARTICLE_HREF)}
		aria-label="Nouvel article"
		class="flex min-h-14 items-center justify-center"
	>
		<span class="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-fg">
			<Icon name="plus" />
		</span>
	</a>
	{@render tab(navItems[2])}
</nav>

{#snippet tab(item: (typeof navItems)[number])}
	{@const active = isActive(item, page.url.pathname)}
	<a
		href={resolve(item.href)}
		aria-current={active ? 'page' : undefined}
		class="flex min-h-14 min-w-11 flex-col items-center justify-center gap-0.5 text-xs transition-colors duration-150 {active
			? 'text-accent'
			: 'text-fg-muted'}"
	>
		<Icon name={item.icon} />
		{item.label}
	</a>
{/snippet}
