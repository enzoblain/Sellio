<script lang="ts">
	import ModelPhotos from '$lib/components/images/ModelPhotos.svelte';
	import PhotoPicker from '$lib/components/images/PhotoPicker.svelte';
	import { photoForm, type PhotoDraft } from '$lib/components/images/photo-draft';
	import { refreshListingViews } from '$lib/components/listings/refresh-views';
	import { tick } from 'svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { toast } from '$lib/components/ui/toast.svelte';
	import ListingFields from '$lib/components/listings/ListingFields.svelte';
	import Page from '$lib/components/ui/Page.svelte';
	import type { AutocompleteItem } from '$lib/components/form/Autocomplete.svelte.js';

	import { createListing } from '$lib/remote/listings.remote';

	let selectedBrand = $state<AutocompleteItem>({ value: '', uuid: null });
	let selectedModel = $state<AutocompleteItem>({ value: '', uuid: null });
	let selectedSize = $state<AutocompleteItem>({ value: '', uuid: null });
	let selectedColor = $state<AutocompleteItem>({ value: '', uuid: null });

	let price = $state<number | undefined>(undefined);
	let shippingCost = $state<number | undefined>(undefined);

	let saving = $state(false);
	let errorMessage = $state('');
	let photos = $state<PhotoDraft[]>([]);
	let cover = $state<string | null>(null);
	let photoBusy = $state(false);
	let modelPhotoBusy = $state(false);
	let createdId = $state<string | null>(null);
	// Change à chaque « Ajouter et en créer un autre » : remonte les photos du modèle
	let resetKey = $state(0);

	const isValid = $derived(
		!photoBusy &&
			!modelPhotoBusy &&
			selectedBrand.value.trim().length > 0 &&
			selectedModel.value.trim().length > 0 &&
			selectedSize.value.trim().length > 0 &&
			selectedColor.value.trim().length > 0 &&
			price !== undefined &&
			price >= 0 &&
			shippingCost !== undefined &&
			shippingCost >= 0
	);

	async function confirm(another = false) {
		if (!isValid || saving) return;
		saving = true;
		errorMessage = '';
		let focusSize = false;

		try {
			if (!createdId) {
				const listing = await createListing({
					brand: selectedBrand,
					model: selectedModel,
					size: selectedSize,
					color: selectedColor,
					purchasePrice: price!,
					shippingPrice: shippingCost!
				});
				createdId = listing.id;
			}
			if (photos.length) {
				const response = await fetch(resolve('/api/listings/[id]/images', { id: createdId }), {
					method: 'POST',
					body: photoForm(photos, cover)
				});
				const result = await response.json();
				if (!result.ok) {
					errorMessage = `L’article est enregistré, mais les photos n’ont pas été ajoutées : ${result.error}`;
					return;
				}
			}
			await refreshListingViews(createdId);
			toast('Article ajouté');
			if (another) {
				// On garde marque et modèle, on vide le reste
				selectedSize = { value: '', uuid: null };
				selectedColor = { value: '', uuid: null };
				price = undefined;
				shippingCost = undefined;
				photos = [];
				cover = null;
				createdId = null;
				resetKey++;
				focusSize = true;
			} else await goto(resolve('/to-collect'));
		} catch {
			errorMessage = createdId
				? 'L’article est enregistré. Réessaie d’envoyer les photos.'
				: 'Impossible d’ajouter l’article. Réessaie.';
		} finally {
			saving = false;
		}
		// Le fieldset est désactivé tant que `saving` est vrai : le focus n'est possible qu'après.
		if (focusSize) {
			await tick();
			document.getElementById('size')?.focus();
		}
	}
</script>

<Page title="Ajouter un article">
	<form
		onsubmit={(event) => {
			event.preventDefault();
			confirm();
		}}
	>
		<div class="grid gap-6 lg:grid-cols-2">
			<Card class="space-y-3 self-start">
				{#key resetKey}
					<ModelPhotos
						modelId={selectedModel.uuid}
						enabled={!createdId}
						bind:photos
						bind:cover
						bind:busy={modelPhotoBusy}
					/>
				{/key}
				<PhotoPicker
					id="new-article-photos"
					bind:photos
					bind:cover
					bind:busy={photoBusy}
					disabled={saving || modelPhotoBusy}
				/>
			</Card>
			<fieldset disabled={saving || !!createdId} class="space-y-6">
				<ListingFields
					bind:brand={selectedBrand}
					bind:model={selectedModel}
					bind:size={selectedSize}
					bind:color={selectedColor}
					bind:price
					bind:shippingCost
				/>
			</fieldset>
		</div>
		{#if errorMessage}<p role="alert" class="mt-4 text-sm text-danger">{errorMessage}</p>{/if}
		<div
			class="sticky bottom-16 z-10 mt-6 flex flex-wrap justify-end gap-3 rounded-lg border border-border bg-surface p-3 md:bottom-4"
		>
			<Button variant="secondary" href={resolve('/to-collect')}>Annuler</Button>
			<Button
				type="button"
				variant="secondary"
				disabled={!isValid || saving || !!createdId}
				onclick={() => confirm(true)}>Ajouter et en créer un autre</Button
			>
			<Button type="submit" disabled={!isValid || saving}>
				{saving ? 'Ajout en cours…' : 'Ajouter'}
			</Button>
		</div>
	</form>
</Page>
