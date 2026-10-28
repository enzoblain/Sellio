<script lang="ts">
	import {
		filterByCarrier,
		formatDeadline,
		formatParcelDate,
		deadlineState,
		parcelSortOptions,
		sortParcels,
		type Parcel,
		type ParcelSort
	} from '$lib/parcels';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { toast } from '$lib/components/ui/toast.svelte';
	import {
		getCollectedParcels,
		getParcelsToCollect,
		removeParcel
	} from '$lib/remote/parcels.remote';

	let { collected = false }: { collected?: boolean } = $props();

	const query = $derived(collected ? getCollectedParcels() : getParcelsToCollect());
	const all = $derived<Parcel[]>((query.current as Parcel[] | undefined) ?? []);
	const loaded = $derived(query.current !== undefined);

	let carrierId = $state('');
	let sort = $state<ParcelSort>('deadline');
	const items = $derived(
		sortParcels(filterByCarrier(all, carrierId ? [Number(carrierId)] : []), sort)
	);
	const carrierOptions = $derived(
		[...new Map(all.map((p) => [p.carrierId, p.carrier]))].map(([id, name]) => ({ id, name }))
	);

	let selectedId = $state<string | null>(null);
	let open = $state(false);
	const selected = $derived(all.find((p) => p.id === selectedId));
	function show(id: string) {
		selectedId = id;
		open = true;
	}

	let deleting = $state(false);
	let deleteError = $state('');
	let dialog = $state<HTMLDialogElement>();
	function askDelete() {
		deleteError = '';
		dialog?.showModal();
	}
	async function confirmDelete() {
		if (!selected || deleting) return;
		deleting = true;
		deleteError = '';
		try {
			await removeParcel(selected.id);
			dialog?.close();
			open = false;
			toast('Colis supprimé');
		} catch {
			deleteError = 'Impossible de supprimer le colis. Réessaie.';
		} finally {
			deleting = false;
		}
	}
</script>

{#if query.error}
	<ErrorState message="Impossible de charger les colis." onretry={() => query.refresh()} />
{:else if !loaded}
	<p class="text-sm text-fg-muted">Chargement des colis…</p>
{:else}
	{#if all.length > 0}
		<div class="mb-4 flex flex-wrap items-center gap-3">
			<Select
				bind:value={carrierId}
				aria-label="Filtrer par transporteur"
				class="min-h-11 w-auto md:min-h-0"
			>
				<option value="">Tous les transporteurs</option>
				{#each carrierOptions as carrier (carrier.id)}
					<option value={String(carrier.id)}>{carrier.name}</option>
				{/each}
			</Select>
			{#if !collected}
				<Select bind:value={sort} aria-label="Trier par" class="min-h-11 w-auto md:min-h-0">
					{#each parcelSortOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</Select>
			{/if}
		</div>
	{/if}
	<ul class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
		{#each items as parcel (parcel.id)}
			{@const state = collected ? null : deadlineState(parcel.pickupDeadline)}
			<li>
				<button
					type="button"
					onclick={() => show(parcel.id)}
					class="flex w-full gap-4 rounded-lg border border-border bg-surface p-3 text-left shadow-sm transition hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					{#if parcel.photos[0]}
						<img
							src={parcel.photos[0].path}
							alt="Code-barres du colis {parcel.carrier}"
							class="h-20 w-20 shrink-0 rounded-md bg-scan object-contain"
						/>
					{/if}
					<span class="min-w-0 flex-1 space-y-1.5">
						<span class="flex flex-wrap items-center gap-2">
							<Badge tone="accent">{parcel.carrier}</Badge>
							{#if state && state.tone !== 'neutral'}
								<Badge tone={state.tone}>{state.label}</Badge>
							{/if}
						</span>
						{#if parcel.pickupPoint}
							<span class="block truncate text-sm text-fg">{parcel.pickupPoint}</span>
						{/if}
						<span class="block text-xs text-fg-muted">
							Ajouté le {formatParcelDate(parcel.createdAt)}
							{#if collected && parcel.collectedAt}
								· récupéré le {formatParcelDate(parcel.collectedAt)}
							{/if}
						</span>
						{#if parcel.pickupDeadline}
							<span class="block text-xs text-fg-muted">
								À récupérer avant le
								<time datetime={parcel.pickupDeadline}>{formatDeadline(parcel.pickupDeadline)}</time
								>
							</span>
						{/if}
					</span>
				</button>
			</li>
		{:else}
			<EmptyState>
				{all.length === 0
					? collected
						? 'Aucun colis récupéré pour le moment.'
						: 'Aucun colis à récupérer.'
					: 'Aucun colis ne correspond au filtre.'}
			</EmptyState>
		{/each}
	</ul>
{/if}

<Drawer bind:open title={selected ? `Colis ${selected.carrier}` : 'Colis'}>
	{#if selected}
		<div class="space-y-5">
			<div class="space-y-3">
				{#each selected.photos as photo, index (photo.id)}
					<img
						src={photo.path}
						alt="Code-barres {index + 1} du colis {selected.carrier}"
						class="w-full rounded-lg bg-scan object-contain p-4"
					/>
				{:else}
					<p class="text-sm text-fg-muted">Aucune photo.</p>
				{/each}
			</div>
			<dl class="space-y-2 text-sm">
				{#if selected.trackingCode}
					<div>
						<dt class="text-fg-muted">Code de retrait</dt>
						<dd class="font-medium text-fg tabular-nums">{selected.trackingCode}</dd>
					</div>
				{/if}
				{#if selected.pickupPoint}
					<div>
						<dt class="text-fg-muted">Point relais</dt>
						<dd class="text-fg">{selected.pickupPoint}</dd>
					</div>
				{/if}
				{#if selected.pickupDeadline}
					<div>
						<dt class="text-fg-muted">Date limite</dt>
						<dd class="text-fg">{formatDeadline(selected.pickupDeadline)}</dd>
					</div>
				{/if}
			</dl>
			{#if !collected}
				<div class="flex flex-wrap justify-between gap-3">
					<Button variant="ghost" onclick={askDelete}>Supprimer</Button>
					<!-- Branché à la collecte (#28) -->
					<Button disabled title="Disponible bientôt">Récupéré</Button>
				</div>
			{/if}
		</div>
	{/if}
</Drawer>

<Dialog
	bind:element={dialog}
	title="Supprimer ce colis ?"
	description="Les photos seront supprimées. Les articles liés ne sont pas touchés."
	dismissible={!deleting}
>
	{#if deleteError}<p role="alert" class="mb-3 text-sm text-danger">{deleteError}</p>{/if}
	<div class="flex justify-end gap-3">
		<Button variant="ghost" onclick={() => dialog?.close()} disabled={deleting}>Annuler</Button>
		<Button variant="danger" onclick={confirmDelete} disabled={deleting}>
			{deleting ? 'Suppression…' : 'Supprimer'}
		</Button>
	</div>
</Dialog>
