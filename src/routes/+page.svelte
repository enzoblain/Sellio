<script lang="ts">
	import { euros } from '$lib/format';
	import { resolve } from '$app/paths';
	import Card from '$lib/components/ui/Card.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Page from '$lib/components/ui/Page.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { getDashboard } from '$lib/remote/dashboard.remote';
	import { calculateMetrics, type DashboardData } from '$lib/dashboard/metrics';
	const dashboard = getDashboard();
	let selectedYear = $state<number | undefined>();
	const shortEuros = (cents: number) =>
		new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
			notation: 'compact',
			maximumFractionDigits: 1
		}).format(cents / 100);
	const monthNames = [
		'Jan.',
		'Fév.',
		'Mars',
		'Avr.',
		'Mai',
		'Juin',
		'Juil.',
		'Août',
		'Sept.',
		'Oct.',
		'Nov.',
		'Déc.'
	];
	const years = (data: DashboardData) =>
		[
			...new Set(
				[
					data.currentYear,
					...data.listings.flatMap((item) => [item.purchasedAt, item.soldAt]),
					...data.expenses.map((expense) => expense.date)
				]
					.filter((value) => value !== null)
					.map((value) => (typeof value === 'number' ? value : Number(value!.slice(0, 4))))
			)
		].sort((a, b) => b - a);
	const stockLabels: Record<number, string> = {
		0: 'À récupérer',
		6: 'En stock',
		1: 'En vente',
		2: 'À expédier',
		3: 'Expédié'
	};
	const stockLinks = {
		0: '/to-collect',
		6: '/stock',
		1: '/listed',
		2: '/to-ship',
		3: '/shipped'
	} as const;
</script>

<Page>
	{#await dashboard}
		<h1 class="text-2xl text-fg">Dashboard</h1>
		<p class="mt-6 text-sm text-fg-muted">Chargement des statistiques…</p>
	{:then data}
		{@const year = selectedYear ?? data.currentYear}
		{@const stats = calculateMetrics(data, year)}
		{@const maximum = Math.max(
			100,
			...stats.months.flatMap((month) => [
				month.revenue,
				Object.values(month.costs).reduce((a, b) => a + b, 0)
			])
		)}
		<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
			<div>
				<h1 class="text-2xl text-fg">Dashboard</h1>
				<p class="mt-1 text-sm text-fg-muted">
					Tes ventes, tes dépenses et la rentabilité de tes articles.
				</p>
			</div>
			<div>
				<label for="dashboard-year" class="mr-2 text-sm text-fg-muted">Année</label><Select
					id="dashboard-year"
					value={year}
					onchange={(event) => (selectedYear = Number(event.currentTarget.value))}
					class="w-auto py-1.5 text-sm"
					>{#each years(data) as availableYear (availableYear)}<option value={availableYear}
							>{availableYear}</option
						>{/each}</Select
				>
			</div>
		</div>
		<div class="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{#each [{ label: 'Revenus', value: euros(stats.revenue), detail: `${stats.soldCount} article${stats.soldCount === 1 ? '' : 's'} vendu${stats.soldCount === 1 ? '' : 's'}` }, { label: 'Bénéfice des articles', value: euros(stats.profit), detail: 'Prix vendus − achats et ports des articles vendus' }, { label: 'Bénéfice moyen / article', value: stats.averageProfit === null ? '—' : euros(stats.averageProfit), detail: 'Sur les articles vendus cette année' }, { label: 'Multiplicateur moyen', value: stats.averageRatio === null ? '—' : `×${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(stats.averageRatio)}`, detail: 'Moyenne des prix vendus ÷ achats totaux' }] as metric (metric.label)}
				<Card>
					<p class="text-sm text-fg-muted">{metric.label}</p>
					<p class="mt-3 text-2xl font-semibold text-fg">{metric.value}</p>
					<p class="mt-2 text-xs text-fg-muted">{metric.detail}</p>
				</Card>
			{/each}
		</div>
		<Card class="mb-6">
			<h2 class="font-semibold text-fg">Potentiel des articles en vente</h2>
			<p class="mt-1 text-sm text-fg-muted">
				Tous les articles actuellement en vente, quelle que soit l’année d’achat. Estimation s’ils
				sont vendus au prix affiché.
			</p>
			<div class="mt-4 grid gap-5 sm:grid-cols-2">
				<div>
					<p class="text-sm text-fg-muted">Total des prix de mise en vente</p>
					<p class="mt-2 text-2xl font-semibold text-fg">{euros(stats.potentialRevenue)}</p>
					<p class="mt-2 text-xs text-fg-muted">
						{stats.listedCount} article{stats.listedCount === 1 ? '' : 's'} en vente
					</p>
				</div>
				<div>
					<p class="text-sm text-fg-muted">Bénéfice potentiel</p>
					<p class="mt-2 text-2xl font-semibold text-fg">{euros(stats.potentialProfit)}</p>
					<p class="mt-2 text-xs text-fg-muted">
						Prix affichés − achats et ports de ces articles, avant autres frais
					</p>
				</div>
			</div>
		</Card>
		<Card>
			<div class="mb-5">
				<h2 class="font-semibold text-fg">Revenus et dépenses par mois</h2>
				<p class="mt-1 text-sm text-fg-muted">
					Les dépenses regroupent les achats d’articles, leurs frais de port et tous les autres
					frais.
				</p>
			</div>
			<div class="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-fg-muted">
				<span class="flex items-center gap-2"
					><span class="h-2.5 w-2.5 rounded-sm bg-chart-revenue"></span>Revenus</span
				>
				{#each stats.categories as category (category.id)}
					<span class="flex items-center gap-2"
						><span class="h-2.5 w-2.5 rounded-sm" style:background={category.color}
						></span>{category.name}</span
					>
				{/each}
			</div>
			<div class="overflow-x-auto">
				<svg
					viewBox="0 0 960 300"
					class="w-full min-w-[700px]"
					role="img"
					aria-labelledby="chart-title chart-description"
				>
					<title id="chart-title">Revenus et dépenses mensuels en {year}</title><desc
						id="chart-description"
						>Une barre verte pour les revenus et une barre empilée distinguant les achats
						d’articles, les frais de port et les autres dépenses regroupées pour chaque mois. Les
						chiffres détaillés figurent dans le tableau ci-dessous.</desc
					>
					{#each [0, 0.25, 0.5, 0.75, 1] as fraction (fraction)}
						<line
							x1="65"
							x2="950"
							y1={250 - fraction * 210}
							y2={250 - fraction * 210}
							stroke="var(--border)"
						/><text
							x="55"
							y={254 - fraction * 210}
							text-anchor="end"
							fill="var(--fg-muted)"
							font-size="11">{shortEuros(maximum * fraction)}</text
						>
					{/each}
					{#each stats.months as month, index (month.key)}
						{@const x = 78 + index * 73}
						<rect
							{x}
							y={250 - (month.revenue / maximum) * 210}
							width="21"
							height={(month.revenue / maximum) * 210}
							rx="3"
							fill="var(--chart-revenue)"
							><title>{monthNames[index]} : revenus {euros(month.revenue)}</title></rect
						>
						{#each stats.categories as category, categoryIndex (category.id)}
							{@const amount = month.costs[category.id] ?? 0}
							{@const previous = stats.categories
								.slice(0, categoryIndex)
								.reduce((sum, entry) => sum + (month.costs[entry.id] ?? 0), 0)}
							<rect
								x={x + 25}
								y={250 - ((previous + amount) / maximum) * 210}
								width="21"
								height={(amount / maximum) * 210}
								fill={category.color}
								><title>{monthNames[index]} : {category.name}, {euros(amount)}</title></rect
							>
						{/each}
						<text x={x + 23} y="278" text-anchor="middle" fill="var(--fg-muted)" font-size="11"
							>{monthNames[index]}</text
						>
					{/each}
				</svg>
			</div>
			{#if stats.revenue === 0 && stats.totalExpenses === 0}<p
					class="mt-2 text-center text-sm text-fg-muted"
				>
					Aucune activité datée pour cette année.
				</p>{/if}
		</Card>
		<div class="mt-6 grid gap-5 lg:grid-cols-2">
			<Card>
				<h2 class="mb-5 font-semibold text-fg">Répartition des dépenses</h2>
				{#each stats.categories as category (category.id)}
					{@const total = stats.months.reduce(
						(sum, month) => sum + (month.costs[category.id] ?? 0),
						0
					)}
					<div class="mb-4">
						<div class="mb-2 flex items-center justify-between gap-3 text-sm">
							<span class="text-fg-muted">{category.name}</span><span class="font-medium text-fg"
								>{euros(total)}</span
							>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-surface-2">
							<div
								class="h-full rounded-full"
								style:background={category.color}
								style:width={`${stats.totalExpenses ? (total / stats.totalExpenses) * 100 : 0}%`}
							></div>
						</div>
					</div>
				{/each}
				<div class="flex justify-between border-t border-border pt-4 text-sm font-semibold text-fg">
					<span>Total dépenses</span><span>{euros(stats.totalExpenses)}</span>
				</div>
			</Card>
			<Card>
				<h2 class="mb-5 font-semibold text-fg">Vue d’ensemble</h2>
				<div class="grid grid-cols-2 gap-3">
					{#each stats.stock as entry (entry.status)}<a
							href={resolve(stockLinks[entry.status as keyof typeof stockLinks])}
							class="rounded-lg bg-surface-2 p-4 transition hover:bg-border"
							><p class="text-xs text-fg-muted">{stockLabels[entry.status]}</p>
							<p class="mt-2 text-xl font-semibold text-fg">{entry.count}</p></a
						>{/each}
				</div>
				<div class="mt-5 space-y-3 border-t border-border pt-4">
					<div class="flex justify-between gap-4 text-sm">
						<span class="text-fg-muted">Bénéfice après dépenses</span><span
							class="font-semibold text-fg">{euros(stats.netProfit)}</span
						>
					</div>
					<p class="text-xs text-fg-muted">
						Bénéfice des articles vendus − autres dépenses de l’année.
					</p>
					<div class="flex justify-between gap-4 text-sm">
						<span class="text-fg-muted">Solde revenus − dépenses</span><span
							class="font-semibold text-fg">{euros(stats.cashBalance)}</span
						>
					</div>
					<p class="text-xs text-fg-muted">Inclut aussi les achats des articles encore en stock.</p>
				</div>
			</Card>
		</div>
		<details class="mt-6 rounded-lg border border-border bg-surface p-5 text-sm shadow-sm">
			<summary class="cursor-pointer font-medium text-fg">Détail des montants mensuels</summary>
			<div class="mt-4 overflow-x-auto">
				<table class="w-full text-left">
					<thead class="text-xs text-fg-muted"
						><tr
							><th class="py-3">Mois</th><th class="py-3 text-right">Revenus</th><th
								class="py-3 text-right">Dépenses</th
							><th class="py-3 text-right">Solde</th></tr
						></thead
					><tbody
						>{#each stats.months as month, index (month.key)}{@const cost = Object.values(
								month.costs
							).reduce((a, b) => a + b, 0)}<tr class="border-t border-border"
								><td class="py-3 text-fg-muted">{monthNames[index]}</td><td class="py-3 text-right"
									>{euros(month.revenue)}</td
								><td class="py-3 text-right">{euros(cost)}</td><td
									class="py-3 text-right font-medium text-fg">{euros(month.revenue - cost)}</td
								></tr
							>{/each}</tbody
					>
				</table>
			</div>
		</details>
		<p class="mt-5 text-xs leading-relaxed text-fg-muted">
			Les ventes sont comptées au passage en « à expédier » ; les articles retournés sont exclus.
			Les achats sont datés de l’ajout dans Sellio. Le multiplicateur inclut les frais de port
			d’achat.{#if stats.zeroCostSales > 0}
				{stats.zeroCostSales} vente(s) sans coût d’achat exclue(s) de la moyenne du multiplicateur.{/if}{#if stats.undatedExpenses > 0}
				Dépenses sans date exclues des graphiques : {euros(
					stats.undatedExpenses
				)}.{/if}{#if stats.undatedPurchases > 0}
				{stats.undatedPurchases} achat(s) sans date exclu(s) des graphiques.{/if}
		</p>
	{:catch}
		<h1 class="text-2xl text-fg">Dashboard</h1>
		<div class="mt-6">
			<ErrorState
				message="Impossible de charger les statistiques."
				onretry={() => dashboard.refresh()}
			/>
		</div>
	{/await}
</Page>
