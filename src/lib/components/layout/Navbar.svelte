<script lang="ts">
	import { page } from '$app/state';

	type NavIcon = 'dashboard' | 'collect' | 'stock' | 'toship' | 'shipped' | 'expenses';

	type NavItem = {
		label: string;
		href: string;
		icon: NavIcon;
	};

	const items: NavItem[] = [
		{ label: 'Dashboard', href: '/', icon: 'dashboard' },
		{ label: 'À récupérer', href: '/to-collect', icon: 'collect' },
		{ label: 'Stock', href: '/stock', icon: 'stock' },
		{ label: 'À expédier', href: '/to-ship', icon: 'toship' },
		{ label: 'Expédié', href: '/shipped', icon: 'shipped' },
		{ label: 'Dépenses', href: '/expenses', icon: 'expenses' }
	];

	function isActive(href: string) {
		return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	}
</script>

{#snippet navIcon(icon: NavIcon)}
	{#if icon === 'dashboard'}
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="h-5 w-5"
		>
			<path d="M3 10.5 12 3l9 7.5" />
			<path d="M5 9.5V21h5v-6h4v6h5V9.5" />
		</svg>
	{:else if icon === 'collect'}
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="h-5 w-5"
		>
			<path d="M12 3.5v10" />
			<path d="m8 9.5 4 4 4-4" />
			<path d="M4 14v4.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V14" />
		</svg>
	{:else if icon === 'stock'}
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="h-5 w-5"
		>
			<path d="M12 3 3.5 7.5 12 12l8.5-4.5L12 3Z" />
			<path d="m3.5 12 8.5 4.5 8.5-4.5" />
			<path d="m3.5 16.5 8.5 4.5 8.5-4.5" />
		</svg>
	{:else if icon === 'toship'}
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="h-5 w-5"
		>
			<rect x="3" y="9.5" width="12.5" height="11.5" rx="1.5" />
			<path d="M14 3.5h7v7" />
			<path d="M21 3.5 12.5 12" />
		</svg>
	{:else if icon === 'shipped'}
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="h-5 w-5"
		>
			<rect x="3" y="7.5" width="18" height="13" rx="2" />
			<path d="M3 7.5 12 3l9 4.5" />
			<path d="m8.5 13.5 2.5 2.5 5-5" />
		</svg>
	{:else if icon === 'expenses'}
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="h-5 w-5"
		>
			<circle cx="12" cy="12" r="8.5" />
			<path d="M15 8.75a4.5 4.5 0 1 0 0 6.5" />
			<path d="M6.75 10.75h5.5M6.75 13.25h4.5" />
		</svg>
	{/if}
{/snippet}

<nav class="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col bg-violet-950 px-3 py-6 md:flex">
	<span class="mb-8 px-3 text-base font-medium tracking-tight text-white">Sellio</span>

	<ul class="flex flex-1 flex-col gap-0.5">
		{#each items as item}
			<li class="relative">
				{#if isActive(item.href)}
					<span class="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-white"
					></span>
				{/if}
				<a
					href={item.href}
					class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 {isActive(
						item.href
					)
						? 'bg-white/10 text-white'
						: 'text-white/55 hover:bg-white/5 hover:text-white'}"
				>
					{@render navIcon(item.icon)}
					{item.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>

<nav
	class="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-white/5 bg-violet-950/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur md:hidden"
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
					? 'bg-white/15 text-white'
					: 'text-white/50'}"
			>
				{@render navIcon(item.icon)}
			</span>
		</a>
	{/each}
</nav>
