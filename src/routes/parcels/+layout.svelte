<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ParcelForm from '$lib/components/parcels/ParcelForm.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import Page from '$lib/components/ui/Page.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { toast } from '$lib/components/ui/toast.svelte';
	import {
		getCarriers,
		getCollectedParcels,
		getParcelsToCollect
	} from '$lib/remote/parcels.remote';

	let { children }: { children: Snippet } = $props();

	const carriers = getCarriers();
	const toCollect = getParcelsToCollect();
	const collected = getCollectedParcels();
	const current = $derived(
		page.url.pathname.startsWith('/parcels/collected') ? 'collected' : 'to-collect'
	);
	const count = (list: unknown[] | undefined) => (list === undefined ? '' : ` (${list.length})`);
	const tabs = $derived([
		{
			id: 'to-collect',
			label: `À récupérer${count(toCollect.current)}`,
			href: resolve('/parcels')
		},
		{
			id: 'collected',
			label: `Récupérés${count(collected.current)}`,
			href: resolve('/parcels/collected')
		}
	]);

	let open = $state(false);
	let formKey = $state(0);
	let saving = $state(false);
	let errorMessage = $state('');

	function openForm() {
		formKey += 1;
		errorMessage = '';
		open = true;
	}

	async function save(form: FormData) {
		saving = true;
		errorMessage = '';
		try {
			const response = await fetch('/api/parcels', { method: 'POST', body: form });
			const result = (await response.json().catch(() => null)) as {
				ok: boolean;
				error?: string;
			} | null;
			if (!response.ok || !result?.ok) {
				errorMessage = result?.error ?? 'Impossible d’ajouter le colis. Réessaie.';
				return;
			}
			open = false;
			await toCollect.refresh();
			toast('Colis ajouté');
		} catch {
			errorMessage = 'Impossible d’ajouter le colis. Vérifie ta connexion et réessaie.';
		} finally {
			saving = false;
		}
	}
</script>

<Page title="Colis">
	{#snippet actions()}
		<Button onclick={openForm}><span aria-hidden="true">+</span> Colis</Button>
	{/snippet}
	<Tabs {tabs} value={current} label="Statuts des colis" />
	<div class="mt-4">{@render children()}</div>
</Page>

<Drawer bind:open title="Nouveau colis" dismissible={!saving}>
	{#await carriers then list}
		{#key formKey}
			<ParcelForm
				carriers={list}
				{saving}
				{errorMessage}
				onsubmit={save}
				oncancel={() => (open = false)}
			/>
		{/key}
	{/await}
</Drawer>
