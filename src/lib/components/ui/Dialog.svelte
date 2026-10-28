<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		dismissible = true,
		size = 'md',
		element = $bindable(),
		children
	}: {
		title: string;
		description?: string;
		dismissible?: boolean;
		size?: 'md' | 'lg';
		element?: HTMLDialogElement;
		children: Snippet;
	} = $props();

	const uid = $props.id();
	const titleId = `${uid}-title`;
</script>

<dialog
	bind:this={element}
	oncancel={(event) => {
		if (!dismissible) event.preventDefault();
	}}
	aria-labelledby={titleId}
	class="m-auto w-[calc(100%-2rem)] rounded-xl border border-border bg-surface p-6 text-fg shadow-lg backdrop:bg-overlay {size ===
	'lg'
		? 'max-h-[90vh] max-w-2xl overflow-y-auto'
		: 'max-w-md overflow-visible'}"
>
	<h2 id={titleId} class="text-lg">{title}</h2>
	{#if description}<p class="mt-1 text-sm text-fg-muted">{description}</p>{/if}
	<div class="mt-6">
		{@render children()}
	</div>
</dialog>
