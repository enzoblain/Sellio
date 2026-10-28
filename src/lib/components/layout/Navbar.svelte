<script lang="ts">
	import { page } from '$app/state';
	import Icon, { type IconName } from '$lib/components/ui/Icon.svelte';
	import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';
	import { DARK_MODE_ENABLED } from '$lib/theme';

	type NavItem = {
		label: string;
		href: string;
		icon: IconName;
	};

	const items: NavItem[] = [
		{ label: 'Dashboard', href: '/', icon: 'dashboard' },
		{ label: 'À récupérer', href: '/to-collect', icon: 'collect' },
		{ label: 'Stock', href: '/stock', icon: 'stock' },
		{ label: 'En vente', href: '/listed', icon: 'listed' },
		{ label: 'À expédier', href: '/to-ship', icon: 'toship' },
		{ label: 'Expédié', href: '/shipped', icon: 'shipped' },
		{ label: 'Dépenses', href: '/expenses', icon: 'expenses' }
	];

	function isActive(href: string) {
		return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	}
</script>

<nav
	class="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-border bg-surface px-3 py-6 md:flex"
>
	<div class="mb-8 flex items-center justify-between px-3">
		<span class="text-base font-semibold tracking-tight text-fg">Sellio</span>
		{#if DARK_MODE_ENABLED}<ThemeToggle />{/if}
	</div>

	<ul class="flex flex-1 flex-col gap-0.5">
		{#each items as item}
			<li class="relative">
				{#if isActive(item.href)}
					<span class="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent"
					></span>
				{/if}
				<a
					href={item.href}
					class="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150 {isActive(
						item.href
					)
						? 'bg-surface-2 text-fg'
						: 'text-fg-muted hover:bg-surface-2 hover:text-fg'}"
				>
					<Icon name={item.icon} />
					{item.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>

{#if DARK_MODE_ENABLED}
	<div class="fixed top-2 right-2 z-20 md:hidden"><ThemeToggle /></div>
{/if}

<nav
	class="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur md:hidden"
>
	{#each items as item}
		<a
			href={item.href}
			aria-label={item.label}
			class="flex flex-1 items-center justify-center py-3"
		>
			<span
				class="flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-150 {isActive(
					item.href
				)
					? 'bg-surface-2 text-accent'
					: 'text-fg-muted'}"
			>
				<Icon name={item.icon} />
			</span>
		</a>
	{/each}
</nav>
