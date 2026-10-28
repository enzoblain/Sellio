<script lang="ts" generics="T extends Article">
	import type { Snippet } from 'svelte';
	import DataList from '$lib/components/ui/DataList.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { groupArticles, type Article } from './articles';
	import { getArticlesContext } from './context';
	import ListingCard from './ListingCard.svelte';
	import ListingEditor from './ListingEditor.svelte';
	import ListingStacks from './ListingStacks.svelte';

	let {
		emptyLabel,
		meta,
		figures,
		action
	}: {
		/** Message affiché quand le statut ne contient aucun article. */
		emptyLabel: string;
		/** Ligne complémentaire sous le modèle (stockage, référence…). */
		meta?: Snippet<[T]>;
		/** Colonnes chiffrées (composants Stat), communes à la liste et à la grille. */
		figures: Snippet<[T]>;
		/** Action de transition de l'article. */
		action?: Snippet<[T]>;
	} = $props();

	const articles = getArticlesContext<T>();
	const groups = $derived(groupArticles(articles.items));
	let expanded = $state<string[]>([]);

	function toggle(key: string) {
		expanded = expanded.includes(key)
			? expanded.filter((value) => value !== key)
			: [...expanded, key];
	}
</script>

{#snippet noItems()}
	<EmptyState>
		{#if articles.total === 0}
			{emptyLabel}
		{:else}
			Aucun article ne correspond à ta recherche.
			<Button variant="ghost" class="ml-2" onclick={articles.reset}
				>Réinitialiser les filtres</Button
			>
		{/if}
	</EmptyState>
{/snippet}

{#snippet line(item: T)}
	<ListingEditor listingId={item.id} inline />
	<div class="min-w-0 flex-1">
		<p class="truncate font-medium text-fg">{item.brand} · {item.model}</p>
		<p class="truncate text-fg-muted">{item.size} · {item.color}</p>
		{@render meta?.(item)}
	</div>
	<div class="flex flex-wrap items-center justify-end gap-x-6 gap-y-2">
		{@render figures(item)}
	</div>
	{#if action}<div class="shrink-0">{@render action(item)}</div>{/if}
{/snippet}

{#if articles.view === 'grid'}
	<ListingStacks items={articles.items}>
		{#snippet card(item, stackButton)}
			{#snippet cardAction()}{@render action?.(item)}{/snippet}
			<ListingCard {item} {stackButton} action={cardAction}>
				<h2 class="font-medium text-fg">{item.brand} · {item.model}</h2>
				<p class="mt-1 text-sm text-fg-muted">{item.size} · {item.color}</p>
				{@render meta?.(item)}
				{#snippet footer()}
					{@render figures(item)}
				{/snippet}
			</ListingCard>
		{/snippet}
		{#snippet empty()}{@render noItems()}{/snippet}
	</ListingStacks>
{:else}
	<DataList items={groups} key={(group) => group.key} label="Articles" empty={noItems}>
		{#snippet row(group)}
			{@const open = expanded.includes(group.key)}
			{@const count = group.articles.length}
			<div class="w-full">
				<div class="flex flex-wrap items-center gap-3">
					{@render line(group.articles[0])}
					{#if count > 1}
						<Button
							variant="secondary"
							size="sm"
							onclick={() => toggle(group.key)}
							aria-expanded={open}
							aria-label={`${open ? 'Replier' : 'Déplier'} les ${count} articles`}
						>
							×{count}
						</Button>
					{/if}
				</div>
				{#if open}
					<ul class="mt-3 divide-y divide-border rounded-md border border-border bg-surface-2">
						{#each group.articles.slice(1) as item (item.id)}
							<li class="flex flex-wrap items-center gap-3 px-3 py-2">{@render line(item)}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/snippet}
	</DataList>
{/if}
