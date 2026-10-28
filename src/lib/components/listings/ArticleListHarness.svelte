<script lang="ts">
	// Support de test : fournit le contexte du layout (articles) à ArticleList.
	import ArticleList from './ArticleList.svelte';
	import Stat from './Stat.svelte';
	import { setArticlesContext, type ArticlesContext } from './context';

	let { shared }: { shared: ArticlesContext } = $props();
	// svelte-ignore state_referenced_locally
	setArticlesContext(shared);
</script>

<ArticleList emptyLabel="Rien ici.">
	{#snippet figures(item)}
		<Stat label="Achat" value={String(item.purchasePrice)} />
	{/snippet}
	{#snippet action(item)}
		<button type="button">Récupéré : {item.model}</button>
	{/snippet}
</ArticleList>
