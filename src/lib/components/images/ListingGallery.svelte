<script lang="ts">
	import { getListingImages } from '$lib/remote/images.remote';
	let { listingId, brand, model }: { listingId: string; brand: string; model: string } = $props();
	const gallery = $derived(getListingImages(listingId));
	let index = $state(0);
	let signature = $state('');
	$effect(() => {
		const next = (gallery.current ?? []).map((photo) => `${photo.id}:${photo.isCover}`).join(',');
		if (next !== signature) {
			signature = next;
			index = 0;
		}
	});
</script>

{#snippet placeholder()}
	<div class="flex h-full w-full items-center justify-center bg-violet-50">
		<div class="px-6 text-center">
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.4"
				class="mx-auto mb-4 h-14 w-14 text-violet-300"
				aria-hidden="true"
				><path d="m8 3-5 3-2 5 4 2 2-3v11h10V10l2 3 4-2-2-5-5-3a4 4 0 0 1-8 0Z" /></svg
			>
			<p class="font-medium text-violet-950">{brand}</p>
			<p class="mt-1 text-sm text-gray-500">{model}</p>
		</div>
	</div>
{/snippet}
<div class="relative h-full w-full">
	{#await gallery}{@render placeholder()}
	{:then photos}
		{#if photos.length}
			{@const current = Math.min(index, photos.length - 1)}
			<img
				src={photos[current].path}
				alt={`${brand} ${model}, photo ${current + 1} sur ${photos.length}`}
				class="h-full w-full object-cover"
				loading="lazy"
			/>
			{#if photos.length > 1}
				<button
					type="button"
					aria-label="Photo précédente"
					onclick={() => (index = (current - 1 + photos.length) % photos.length)}
					class="absolute top-1/2 left-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-violet-950 shadow-sm hover:bg-white"
					>‹</button
				>
				<button
					type="button"
					aria-label="Photo suivante"
					onclick={() => (index = (current + 1) % photos.length)}
					class="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-violet-950 shadow-sm hover:bg-white"
					>›</button
				>
				<span
					class="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-950/75 px-3 py-1 text-xs text-white"
					aria-live="polite">{current + 1} / {photos.length}</span
				>
			{/if}
		{:else}{@render placeholder()}{/if}
	{:catch}{@render placeholder()}{/await}
</div>
