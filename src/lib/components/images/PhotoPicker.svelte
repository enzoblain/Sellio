<script lang="ts">
	import { onDestroy } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { PhotoDraft } from './photo-draft';
	let {
		photos = $bindable<PhotoDraft[]>([]),
		cover = $bindable<string | null>(null),
		disabled = false,
		busy = $bindable(false),
		id = 'photo-upload'
	}: {
		photos?: PhotoDraft[];
		cover?: string | null;
		disabled?: boolean;
		busy?: boolean;
		id?: string;
	} = $props();
	let errorMessage = $state('');
	const previews = new SvelteSet<string>();
	onDestroy(() => {
		for (const url of previews) URL.revokeObjectURL(url);
	});
	async function add(event: Event) {
		if (disabled || busy) return;
		const input = event.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = '';
		errorMessage = '';
		if (photos.length + files.length > 12) {
			errorMessage = 'Maximum 12 photos par article.';
			return;
		}
		if (files.some((file) => !file.size || file.size > 10 * 1024 * 1024)) {
			errorMessage = 'Chaque photo doit faire moins de 10 Mo.';
			return;
		}
		if (
			[
				...photos.map((photo) => photo.file).filter((file): file is File => !!file),
				...files
			].reduce((total, file) => total + file.size, 0) >
			30 * 1024 * 1024
		) {
			errorMessage = 'Maximum 30 Mo de nouvelles photos par envoi.';
			return;
		}
		if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
			errorMessage = 'Format refusé : seules les photos JPG, PNG et WebP sont autorisées.';
			return;
		}
		busy = true;
		try {
			for (const file of files) {
				const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
				const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
				const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
				const webp =
					String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
					String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
				if (!(
					(file.type === 'image/jpeg' && jpeg) ||
					(file.type === 'image/png' && png) ||
					(file.type === 'image/webp' && webp)
				)) {
					errorMessage = `Le fichier « ${file.name} » ne correspond pas à son type d’image. Choisis le fichier original.`;
					return;
				}
			}
			const additions = files.map((file) => {
				const path = URL.createObjectURL(file);
				previews.add(path);
				return { token: crypto.randomUUID(), path, file };
			});
			photos = [...photos, ...additions];
			if (!cover && photos.length) cover = photos[0].token;
		} catch {
			errorMessage = 'Impossible de lire une photo. Choisis à nouveau le fichier.';
		} finally {
			busy = false;
		}
	}
	function remove(token: string) {
		const photo = photos.find((photo) => photo.token === token);
		if (photo?.file) {
			URL.revokeObjectURL(photo.path);
			previews.delete(photo.path);
		}
		photos = photos.filter((photo) => photo.token !== token);
		if (cover === token) cover = photos[0]?.token ?? null;
	}
</script>

<section class="space-y-3">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h3 class="text-sm font-medium text-gray-700">
			Photos <span class="font-normal text-gray-400">({photos.length}/12)</span>
		</h3>
		<label
			for={id}
			class="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-violet-950 {disabled
				? 'pointer-events-none opacity-40'
				: 'hover:bg-violet-50'}">+ Ajouter des photos</label
		><input
			{id}
			type="file"
			accept="image/jpeg,image/png,image/webp"
			multiple
			onchange={add}
			disabled={disabled || busy}
			class="sr-only"
		/>
	</div>
	<p class="text-xs text-gray-400">
		JPG, PNG ou WebP, 10 Mo par photo. La couverture apparaît en premier sur la carte.
	</p>
	{#if busy}<p class="text-xs text-gray-500" role="status">Vérification des photos…</p>{/if}
	{#if errorMessage}<p role="alert" class="text-sm text-red-600">{errorMessage}</p>{/if}
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
		{#each photos as photo, index (photo.token)}
			<div
				class="overflow-hidden rounded-lg border {photo.token === cover
					? 'border-violet-500 ring-1 ring-violet-500'
					: 'border-gray-200'}"
			>
				<div class="relative aspect-square">
					<img
						src={photo.path}
						alt={`Photo ${index + 1} de l’article`}
						class="h-full w-full object-cover"
					/>{#if photo.token === cover}<span
							class="absolute right-2 bottom-2 left-2 rounded-md bg-violet-950/90 px-2 py-1 text-center text-xs text-white"
							>Couverture</span
						>{/if}
				</div>
				<div class="flex flex-wrap justify-between gap-2 bg-white p-2">
					<button
						type="button"
						onclick={() => (cover = photo.token)}
						disabled={disabled || busy || photo.token === cover}
						aria-label={`Utiliser la photo ${index + 1} comme couverture`}
						class="text-xs font-medium text-violet-950 disabled:opacity-40">Couverture</button
					><button
						type="button"
						onclick={() => remove(photo.token)}
						disabled={disabled || busy}
						aria-label={`Retirer la photo ${index + 1}`}
						class="text-xs font-medium text-red-600 disabled:opacity-40">Retirer</button
					>
				</div>
			</div>
		{:else}<div
				class="col-span-full rounded-lg border border-dashed border-gray-300 p-5 text-center text-sm text-gray-400"
			>
				Aucune photo ajoutée.
			</div>{/each}
	</div>
</section>
