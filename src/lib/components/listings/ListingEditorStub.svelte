<script lang="ts">
	// Support de test : remplace ListingEditor (formulaire) dans ArticleDetail.test.ts.
	let {
		listingId,
		saving = $bindable(false),
		onsaved,
		oncancel
	}: { listingId: string; saving?: boolean; onsaved: () => void; oncancel: () => void } = $props();
</script>

<p data-testid="editor-stub">{listingId}</p>
<button type="button" onclick={() => (saving = true)}>Enregistrement</button>
<button type="button" onclick={onsaved}>Enregistré</button>
<button type="button" onclick={oncancel}>Annuler l’édition</button>
<span hidden>{saving}</span>
