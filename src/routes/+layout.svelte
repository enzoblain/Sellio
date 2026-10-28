<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	import Navbar from '$lib/components/layout/Navbar.svelte';
	import { sidebar } from '$lib/components/layout/sidebar.svelte';
	import Toaster from '$lib/components/ui/Toaster.svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<Navbar />
<main class="pb-20 md:pb-0 {sidebar.collapsed ? 'md:pl-16' : 'md:pl-60'}">
	{@render children()}
</main>
<Toaster />
