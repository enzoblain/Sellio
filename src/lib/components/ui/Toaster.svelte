<script lang="ts">
	import Icon from './Icon.svelte';
	import { dismissToast, toasts } from './toast.svelte';

	const tones = { success: 'bg-success', danger: 'bg-danger', info: 'bg-fg-muted' };
</script>

<div
	role="status"
	aria-live="polite"
	class="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:bottom-6 md:items-end"
>
	{#each toasts.items as item (item.id)}
		<div
			class="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border border-border bg-surface py-1 pr-1 pl-4 text-sm text-fg shadow-lg"
		>
			<span class="h-2 w-2 shrink-0 rounded-full {tones[item.tone]}" aria-hidden="true"></span>
			<span class="flex-1 py-2">{item.message}</span>
			<button
				type="button"
				onclick={() => dismissToast(item.id)}
				aria-label="Fermer la notification"
				class="flex h-11 w-11 items-center justify-center rounded-md text-fg-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			>
				<Icon name="close" class="h-4 w-4" />
			</button>
		</div>
	{/each}
</div>
