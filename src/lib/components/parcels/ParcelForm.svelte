<script lang="ts">
	import { onDestroy } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';

	let {
		carriers,
		saving = false,
		errorMessage = '',
		onsubmit,
		oncancel
	}: {
		carriers: { id: number; name: string }[];
		saving?: boolean;
		errorMessage?: string;
		onsubmit: (form: FormData) => void;
		oncancel: () => void;
	} = $props();

	const MAX_PHOTOS = 6;
	const MAX_SIZE = 10 * 1024 * 1024;
	const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

	type Shot = { token: string; file: File; url: string };
	let shots = $state<Shot[]>([]);
	let carrierId = $state('');
	let pickupPoint = $state('');
	let pickupDeadline = $state('');
	let trackingCode = $state('');
	let photoError = $state('');
	const valid = $derived(shots.length > 0 && carrierId !== '');

	onDestroy(() => shots.forEach((shot) => URL.revokeObjectURL(shot.url)));

	function pick(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = '';
		photoError = '';
		if (shots.length + files.length > MAX_PHOTOS) {
			photoError = `Maximum ${MAX_PHOTOS} photos par colis.`;
			return;
		}
		if (files.some((file) => !TYPES.includes(file.type))) {
			photoError = 'Format refusé : seules les photos JPG, PNG et WebP sont autorisées.';
			return;
		}
		if (files.some((file) => !file.size || file.size > MAX_SIZE)) {
			photoError = 'Chaque photo doit faire moins de 10 Mo.';
			return;
		}
		shots = [
			...shots,
			...files.map((file) => ({
				token: crypto.randomUUID(),
				file,
				url: URL.createObjectURL(file)
			}))
		];
	}

	function remove(token: string) {
		const shot = shots.find((item) => item.token === token);
		if (shot) URL.revokeObjectURL(shot.url);
		shots = shots.filter((item) => item.token !== token);
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!valid || saving) return;
		const form = new FormData();
		form.append('carrierId', carrierId);
		form.append('pickupPoint', pickupPoint);
		form.append('pickupDeadline', pickupDeadline);
		form.append('trackingCode', trackingCode);
		for (const shot of shots) form.append('photos', shot.file);
		onsubmit(form);
	}

	const labelClass =
		'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-fg hover:bg-surface-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring';
</script>

<form onsubmit={submit} class="space-y-5">
	<div class="space-y-3">
		<h3 class="text-sm font-medium text-fg">
			Photos du code-barres <span class="font-normal text-fg-muted"
				>({shots.length}/{MAX_PHOTOS})</span
			>
		</h3>
		<div class="flex flex-wrap gap-3">
			<label class={labelClass}>
				{shots.length ? 'Ajouter une photo' : 'Prendre une photo'}
				<input
					type="file"
					accept="image/jpeg,image/png,image/webp"
					capture="environment"
					onchange={pick}
					disabled={saving}
					class="sr-only"
				/>
			</label>
			<label class={labelClass}>
				Depuis la galerie
				<input
					type="file"
					accept="image/jpeg,image/png,image/webp"
					multiple
					onchange={pick}
					disabled={saving}
					class="sr-only"
				/>
			</label>
		</div>
		{#if photoError}<p role="alert" class="text-sm text-danger">{photoError}</p>{/if}
		{#if shots.length}
			<ul class="grid grid-cols-3 gap-3">
				{#each shots as shot, index (shot.token)}
					<li class="overflow-hidden rounded-lg border border-border">
						<img
							src={shot.url}
							alt="Photo {index + 1} du colis"
							class="aspect-square w-full bg-scan object-contain"
						/>
						<button
							type="button"
							onclick={() => remove(shot.token)}
							disabled={saving}
							aria-label="Retirer la photo {index + 1}"
							class="min-h-11 w-full text-xs font-medium text-danger disabled:opacity-40"
							>Retirer</button
						>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<Field label="Transporteur" id="parcel-carrier">
		{#snippet children(aria)}
			<Select id="parcel-carrier" bind:value={carrierId} required disabled={saving} {...aria}>
				<option value="" disabled>Choisir…</option>
				{#each carriers as carrier (carrier.id)}
					<option value={String(carrier.id)}>{carrier.name}</option>
				{/each}
			</Select>
		{/snippet}
	</Field>
	<Field label="Point relais (facultatif)" id="parcel-point">
		{#snippet children(aria)}
			<Input
				id="parcel-point"
				bind:value={pickupPoint}
				maxlength={200}
				disabled={saving}
				{...aria}
			/>
		{/snippet}
	</Field>
	<Field label="Date limite (facultatif)" id="parcel-deadline">
		{#snippet children(aria)}
			<Input
				id="parcel-deadline"
				type="date"
				bind:value={pickupDeadline}
				disabled={saving}
				{...aria}
			/>
		{/snippet}
	</Field>
	<Field label="Code de retrait (facultatif)" id="parcel-code">
		{#snippet children(aria)}
			<Input
				id="parcel-code"
				bind:value={trackingCode}
				maxlength={200}
				autocomplete="off"
				disabled={saving}
				{...aria}
			/>
		{/snippet}
	</Field>

	{#if errorMessage}<p role="alert" class="text-sm text-danger">{errorMessage}</p>{/if}
	<div class="flex justify-end gap-3">
		<Button variant="ghost" type="button" onclick={oncancel} disabled={saving}>Annuler</Button>
		<Button type="submit" disabled={!valid || saving}>
			{saving ? 'Enregistrement…' : 'Enregistrer'}
		</Button>
	</div>
</form>
