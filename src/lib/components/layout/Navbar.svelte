<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';
	import { getParcelsToCollect } from '$lib/remote/parcels.remote';
	import { DARK_MODE_ENABLED } from '$lib/theme';
	import { isActive, navItems, NEW_ARTICLE_HREF } from './nav';
	import { restoreSidebar, sidebar, toggleSidebar } from './sidebar.svelte';

	onMount(restoreSidebar);

	const parcelCount = $derived(getParcelsToCollect().current?.length ?? 0);
</script>

<!-- Repli piloté par CSS (data-sidebar sur <html>) : rendu correct dès le premier affichage. -->
<nav
	aria-label="Navigation principale"
	class="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-border bg-surface px-3 py-6 transition-[width] duration-150 md:flex sidebar-collapsed:w-16"
>
	<div
		class="mb-6 flex items-center justify-between px-3 sidebar-collapsed:justify-center sidebar-collapsed:px-0"
	>
		<span class="text-base font-semibold tracking-tight text-fg sidebar-collapsed:hidden"
			>Sellio</span
		>
		<button
			type="button"
			onclick={toggleSidebar}
			aria-label={sidebar.collapsed ? 'Déplier la barre latérale' : 'Replier la barre latérale'}
			aria-expanded={!sidebar.collapsed}
			class="flex items-center justify-center rounded-md p-2 text-fg-muted transition hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
		>
			<Icon name="chevronLeft" class="h-5 w-5 sidebar-collapsed:hidden" />
			<Icon name="chevronRight" class="hidden h-5 w-5 sidebar-collapsed:block" />
		</button>
	</div>

	<Button href={resolve(NEW_ARTICLE_HREF)} size="sm" title="Nouvel article" class="mb-6">
		<Icon name="plus" />
		<span class="sidebar-collapsed:sr-only">Nouvel article</span>
	</Button>

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
					title={item.label}
					class="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150 sidebar-collapsed:justify-center {active
						? 'bg-surface-2 text-fg'
						: 'text-fg-muted hover:bg-surface-2 hover:text-fg'}"
				>
					<Icon name={item.icon} />
					<span class="sidebar-collapsed:sr-only">{item.label}</span>
					{#if item.href === '/parcels' && parcelCount > 0}
						{@render counter()}
					{/if}
				</a>
			</li>
		{/each}
	</ul>

	{#if DARK_MODE_ENABLED}
		<div class="flex px-3 sidebar-collapsed:justify-center sidebar-collapsed:px-0">
			<ThemeToggle />
		</div>
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
	class="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 items-stretch border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur md:hidden"
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
	{@render tab(navItems[3])}
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
		<span class="relative">
			<Icon name={item.icon} />
			{#if item.href === '/parcels' && parcelCount > 0}
				{@render counter(true)}
			{/if}
		</span>
		{item.shortLabel}
	</a>
{/snippet}

{#snippet counter(floating = false)}
	<span
		data-testid="parcel-count"
		class="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-medium text-accent-fg tabular-nums {floating
			? 'absolute -top-1 left-3'
			: 'ml-auto sidebar-collapsed:hidden'}"
	>
		<span class="sr-only">Colis à récupérer :</span>{parcelCount}
	</span>
{/snippet}
