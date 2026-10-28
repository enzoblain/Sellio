<script lang="ts">
	import Button from './Button.svelte';

	let {
		message = 'Une erreur est survenue.',
		onretry
	}: { message?: string; onretry?: () => void } = $props();
</script>

<div>
	<p role="alert" class="text-sm text-danger">{message}</p>
	{#if onretry}
		<Button variant="ghost" class="mt-3" onclick={onretry}>Réessayer</Button>
	{/if}
</div>
