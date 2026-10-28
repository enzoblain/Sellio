<script lang="ts">
	import { onMount } from 'svelte';
	import { applyTheme, resolveTheme, setTheme, type Theme } from '$lib/theme';
	import Icon from './Icon.svelte';

	let theme = $state<Theme>('light');

	onMount(() => {
		theme = resolveTheme();
		applyTheme(theme);
	});

	function toggle() {
		theme = theme === 'dark' ? 'light' : 'dark';
		setTheme(theme);
	}
</script>

<button
	type="button"
	onclick={toggle}
	aria-label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
	class="flex items-center justify-center rounded-md p-2 text-fg-muted transition hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
>
	<Icon name={theme === 'dark' ? 'sun' : 'moon'} />
</button>
