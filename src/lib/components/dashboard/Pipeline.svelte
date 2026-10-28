<script lang="ts">
	import { resolve } from '$app/paths';
	import Card from '$lib/components/ui/Card.svelte';

	let { stock }: { stock: { status: number; count: number }[] } = $props();

	const steps: Record<
		number,
		{ label: string; href: '/to-collect' | '/stock' | '/listed' | '/to-ship' | '/shipped' }
	> = {
		0: { label: 'À récupérer', href: '/to-collect' },
		6: { label: 'En stock', href: '/stock' },
		1: { label: 'En vente', href: '/listed' },
		2: { label: 'À expédier', href: '/to-ship' },
		3: { label: 'Expédié', href: '/shipped' }
	};
	// Même teinte pour le segment de la barre et la pastille du statut.
	const shade = (index: number) =>
		`color-mix(in srgb, var(--accent) ${40 + index * 15}%, transparent)`;
	const total = $derived(stock.reduce((sum, entry) => sum + entry.count, 0));
</script>

<Card>
	<h2 class="font-semibold text-fg">Pipeline</h2>
	<p class="mt-1 text-sm text-fg-muted">
		{total} article{total === 1 ? '' : 's'} sur l’ensemble du parcours, de la récupération à l’expédition.
	</p>
	<div class="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
		{#each stock as entry, index (entry.status)}
			{#if entry.count > 0}
				<div
					data-testid="pipeline-segment"
					class="h-full"
					style:flex-grow={entry.count}
					style:background={shade(index)}
				></div>
			{/if}
		{/each}
	</div>
	<ul class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
		{#each stock as entry, index (entry.status)}
			{@const step = steps[entry.status]}
			<li>
				<a
					href={resolve(step.href)}
					class="block min-h-11 rounded-lg bg-surface-2 p-4 transition-colors hover:bg-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					<span class="flex items-center gap-2 text-xs text-fg-muted">
						<span
							data-testid="pipeline-dot"
							class="h-2.5 w-2.5 shrink-0 rounded-full"
							style:background={shade(index)}
							aria-hidden="true"
						></span>{step.label}
					</span>
					<span class="mt-2 block text-xl font-semibold text-fg tabular-nums">{entry.count}</span>
				</a>
			</li>
		{/each}
	</ul>
</Card>
