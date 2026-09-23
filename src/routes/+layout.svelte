<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	import Navbar from '$lib/components/layout/Navbar.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<Navbar />
<main class="pb-16 md:pb-0 md:pl-60">
	{@render children()}
</main>
