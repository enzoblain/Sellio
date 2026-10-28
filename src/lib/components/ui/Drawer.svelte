<script lang="ts">
	import type { Snippet } from 'svelte';
	import Dialog from './Dialog.svelte';
	import Icon from './Icon.svelte';

	let {
		open = $bindable(false),
		title,
		description,
		onclose,
		children
	}: {
		open?: boolean;
		title: string;
		description?: string;
		onclose?: () => void;
		children: Snippet;
	} = $props();

	let element = $state<HTMLDialogElement>();

	$effect(() => {
		if (!element) return;
		if (open && !element.open) element.showModal();
		else if (!open && element.open) element.close();
	});

	function handleClose() {
		open = false;
		onclose?.();
	}
</script>

<Dialog bind:element {title} {description} size="drawer" onclose={handleClose}>
	<button
		type="button"
		onclick={() => (open = false)}
		aria-label="Fermer"
		class="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-md text-fg-muted transition hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
	>
		<Icon name="close" />
	</button>
	{@render children()}
</Dialog>
