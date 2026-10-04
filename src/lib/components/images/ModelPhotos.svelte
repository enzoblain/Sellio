<script lang="ts">
	import { untrack } from 'svelte';
	import { getModelPhotos } from '$lib/remote/images.remote';
	import type { PhotoDraft } from './photo-draft';
	let {
		modelId,
		enabled = true,
		photos = $bindable<PhotoDraft[]>([]),
		cover = $bindable<string | null>(null),
		busy = $bindable(false)
	}: {
		modelId: string | null;
		enabled?: boolean;
		photos?: PhotoDraft[];
		cover?: string | null;
		busy?: boolean;
	} = $props();
	let error = $state('');
	let previousModel: string | null | undefined;
	$effect(() => {
		const id = modelId;
		if (!enabled) return;
		let active = true;
		untrack(() => {
			const changed = previousModel !== undefined && id !== previousModel;
			previousModel = id;
			const kept = photos.filter((photo) => !photo.token.startsWith('reuse:'));
			photos = kept;
			if (!kept.some((photo) => photo.token === cover)) cover = kept[0]?.token ?? null;
			error = '';
			busy = false;
			if (!id || (!changed && kept.length) || kept.some((photo) => photo.file)) return;
			busy = true;
			(async () => {
				try {
					const query = getModelPhotos(id);
					const refreshed = await query.refresh();
					const result = refreshed ?? (await query);
					if (
						!active ||
						photos.some((photo) => photo.file) ||
						(!changed && photos.length) ||
						!result.length
					)
						return;
					photos = result.map((photo) => ({ token: `reuse:${photo.id}`, path: photo.path }));
					cover =
						photos.find((_, index) => result[index].isCover)?.token ?? photos[0]?.token ?? null;
				} catch {
					if (active)
						error =
							'Impossible de récupérer les photos du modèle. Tu peux ajouter tes propres photos.';
				} finally {
					if (active) busy = false;
				}
			})();
		});
		return () => {
			active = false;
		};
	});
</script>

{#if busy}<p class="text-xs text-gray-500" role="status">Chargement des photos du modèle…</p>{/if}
{#if error}<p class="text-sm text-red-600" role="alert">{error}</p>{/if}
