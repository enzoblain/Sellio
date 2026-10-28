<script lang="ts">
	import { onMount } from 'svelte';
	import { applyTheme, resolveTheme, setTheme, type Theme } from '$lib/theme';
	import Icon from './Icon.svelte';

	// Inconnu côté serveur : on n'affiche le bouton qu'une fois le thème résolu, pour ne pas montrer le mauvais état.
	let theme = $state<Theme | null>(null);

	onMount(() => {
		theme = resolveTheme();
		applyTheme(theme);
	});

	function toggle() {
		theme = theme === 'dark' ? 'light' : 'dark';
		setTheme(theme);
	}
</script>

{#if theme}
	<button
		type="button"
		onclick={toggle}
		aria-label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
		class="flex items-center justify-center rounded-md p-2 text-fg-muted transition hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
	>
		<Icon name={theme === 'dark' ? 'sun' : 'moon'} />
	</button>
{:else}
	<span class="h-9 w-9" aria-hidden="true"></span>
{/if}
