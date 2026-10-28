<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		NO_PLACE,
		STATUS_TABS,
		distinct,
		filterArticles,
		filtersFromParams,
		paramsFromFilters,
		sortArticles,
		sortOptions,
		statusFromPath,
		type Article,
		type ArticleFilters,
		type ArticleStatus
	} from '$lib/components/listings/articles';
	import { setArticlesContext, type ArticleView } from '$lib/components/listings/context';
	import Button from '$lib/components/ui/Button.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import FilterBar from '$lib/components/ui/FilterBar.svelte';
	import Page from '$lib/components/ui/Page.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import SegmentedControl from '$lib/components/ui/SegmentedControl.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import {
		getListedListings,
		getShippedListings,
		getStockListings,
		getToCollectListings,
		getToShipListings
	} from '$lib/remote/listings.remote';

	let { children }: { children: Snippet } = $props();

	const VIEW_KEY = 'articles-view';
	const queries = {
		'to-collect': getToCollectListings(),
		stock: getStockListings(),
		listed: getListedListings(),
		'to-ship': getToShipListings(),
		shipped: getShippedListings()
	};

	const status = $derived<ArticleStatus>(statusFromPath(page.url.pathname) ?? 'to-collect');
	const query = $derived(queries[status]);
	const all = $derived<Article[]>((query.current as Article[] | undefined) ?? []);
	const loaded = $derived(query.current !== undefined);

	// L'état de recherche vit dans l'URL ; on le recopie dans un état local pour une saisie fluide.
	let filters = $state<ArticleFilters>(
		filtersFromParams(page.url.searchParams, statusFromPath(page.url.pathname))
	);
	$effect(() => {
		// Changement d'onglet (ou retour arrière) : on repart de ce que dit l'URL.
		const next = filtersFromParams(page.url.searchParams, status);
		untrack(() => {
			if (paramsFromFilters(next).toString() !== paramsFromFilters(filters).toString()) {
				filters = next;
			}
		});
	});
	$effect(() => {
		const search = paramsFromFilters(filters).toString();
		untrack(() => {
			if (search === page.url.searchParams.toString()) return;
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- on ne change que la query string
			goto(`${page.url.pathname}${search ? `?${search}` : ''}`, {
				replaceState: true,
				keepFocus: true,
				noScroll: true
			});
		});
	});

	let view = $state<ArticleView>('list');
	$effect(() => {
		const saved = localStorage.getItem(VIEW_KEY);
		if (saved === 'list' || saved === 'grid') view = saved;
	});
	const viewOptions = [
		{ value: 'list', label: 'Liste' },
		{ value: 'grid', label: 'Grille' }
	];

	const items = $derived(sortArticles(filterArticles(all, filters), filters.sort));
	const brandOptions = $derived(
		distinct([...all.map((item) => item.brand), ...filters.brands]).map((value) => ({
			value,
			label: value
		}))
	);
	const placeOptions = $derived(
		distinct([...all.map((item) => item.stockingPlace ?? NO_PLACE), ...filters.places]).map(
			(value) => ({
				value,
				label: value
			})
		)
	);
	const hasPlaces = $derived(status !== 'to-collect');
	const tabs = $derived(
		STATUS_TABS.map((tab) => {
			const count = queries[tab.id].current?.length;
			return {
				id: tab.id,
				label: count === undefined ? tab.label : `${tab.label} (${count})`,
				href: resolve(tab.href)
			};
		})
	);

	function reset() {
		filters = { q: '', sort: filters.sort, places: [], brands: [] };
	}

	setArticlesContext({
		reset,
		get items() {
			return items;
		},
		get total() {
			return all.length;
		},
		get view() {
			return view;
		}
	});
</script>

<Page title="Articles" wide>
	{#snippet actions()}
		<Button href={resolve('/to-collect/insert')}><span aria-hidden="true">+</span> Ajouter</Button>
	{/snippet}
	<Tabs {tabs} value={status} label="Statuts des articles" />
	<div class="mt-4 mb-6 space-y-3">
		<div class="flex flex-wrap items-center gap-3">
			<SearchInput
				bind:value={filters.q}
				aria-label="Rechercher un article"
				placeholder="Marque, modèle, taille, couleur, stockage, référence…"
				class="min-w-0 flex-1 basis-64"
			/>
			<Select bind:value={filters.sort} aria-label="Trier par" class="min-h-11 w-auto md:min-h-0">
				{#each sortOptions(status) as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</Select>
			<SegmentedControl
				label="Affichage"
				options={viewOptions}
				bind:value={
					() => view,
					(next) => {
						view = next as ArticleView;
						localStorage.setItem(VIEW_KEY, view);
					}
				}
			/>
		</div>
		{#if hasPlaces && (placeOptions.length > 1 || filters.places.length > 0)}
			<FilterBar
				label="Filtrer par stockage"
				options={placeOptions}
				bind:selected={filters.places}
			/>
		{/if}
		{#if brandOptions.length > 1 || filters.brands.length > 0}
			<FilterBar label="Filtrer par marque" options={brandOptions} bind:selected={filters.brands} />
		{/if}
	</div>
	{#if query.error}
		<ErrorState message="Impossible de charger les commandes." onretry={() => query.refresh()} />
	{:else if !loaded}
		<p class="text-sm text-fg-muted">Chargement des commandes…</p>
	{:else}
		{@render children()}
	{/if}
</Page>
