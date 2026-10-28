<script lang="ts" module>
	export const icons = {
		dashboard: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h5v-6h4v6h5V9.5'],
		collect: [
			'M12 3.5v10',
			'm8 9.5 4 4 4-4',
			'M4 14v4.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V14'
		],
		stock: ['M3.5 10h17M9 5v5m6-5v5M9 15.5h6'],
		listed: ['M20.5 13.5 13.5 20.5a2 2 0 0 1-2.8 0L3.5 13.3V3.5h9.8l7.2 7.2a2 2 0 0 1 0 2.8Z'],
		toship: ['M14 3.5h7v7', 'M21 3.5 12.5 12'],
		shipped: ['M3 7.5 12 3l9 4.5', 'm8.5 13.5 2.5 2.5 5-5'],
		expenses: ['M15 8.75a4.5 4.5 0 1 0 0 6.5', 'M6.75 10.75h5.5M6.75 13.25h4.5'],
		sun: [
			'M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4'
		],
		moon: ['M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z'],
		articles: ['M4 7.5 12 3l8 4.5v9L12 21l-8-4.5Z', 'm4 7.5 8 4.5 8-4.5M12 12v9'],
		plus: ['M12 5v14M5 12h14'],
		search: ['m20 20-3.5-3.5'],
		close: ['M6 6l12 12M18 6 6 18'],
		chevronLeft: ['m14.5 6-6 6 6 6'],
		chevronRight: ['m9.5 6 6 6-6 6']
	} as const;

	export type IconName = keyof typeof icons;
</script>

<script lang="ts">
	let { name, class: className = 'h-5 w-5' }: { name: IconName; class?: string } = $props();
</script>

<svg
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.6"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	class={className}
	data-icon={name}
>
	{#each icons[name] as d (d)}
		<path {d} />
	{/each}
	{#if name === 'stock'}
		<rect x="3.5" y="5" width="17" height="15.5" rx="2" />
	{:else if name === 'listed'}
		<circle cx="8" cy="8" r="1.25" />
	{:else if name === 'toship'}
		<rect x="3" y="9.5" width="12.5" height="11.5" rx="1.5" />
	{:else if name === 'shipped'}
		<rect x="3" y="7.5" width="18" height="13" rx="2" />
	{:else if name === 'expenses'}
		<circle cx="12" cy="12" r="8.5" />
	{:else if name === 'search'}
		<circle cx="11" cy="11" r="6.5" />
	{:else if name === 'sun'}
		<circle cx="12" cy="12" r="4" />
	{/if}
</svg>
