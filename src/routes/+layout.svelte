<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	import Navbar from '$lib/components/layout/Navbar.svelte';
	import Toaster from '$lib/components/ui/Toaster.svelte';

	let { children } = $props();
</script>

<!-- Un dépôt raté ne doit pas faire ouvrir l'image et perdre le formulaire -->
<svelte:window ondragover={(e) => e.preventDefault()} ondrop={(e) => e.preventDefault()} />
<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<Navbar />
<main class="pb-20 md:pb-0 md:pl-60 sidebar-collapsed:md:pl-16">
	{@render children()}
</main>
<Toaster />
