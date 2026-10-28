<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		dismissible = true,
		size = 'md',
		element = $bindable(),
		onclose,
		children
	}: {
		title: string;
		description?: string;
		dismissible?: boolean;
		size?: 'md' | 'lg' | 'drawer';
		element?: HTMLDialogElement;
		onclose?: () => void;
		children: Snippet;
	} = $props();

	const uid = $props.id();
	// drawer : plein écran sur mobile (bottom sheet), panneau à droite dès md.
	const sizes = {
		md: 'm-auto w-[calc(100%-2rem)] max-w-md overflow-visible rounded-xl p-6',
		lg: 'm-auto w-[calc(100%-2rem)] max-h-[90vh] max-w-2xl overflow-y-auto rounded-xl p-6',
		drawer:
			'm-0 h-dvh max-h-none w-full max-w-none overflow-y-auto p-6 md:ml-auto md:max-w-md md:rounded-l-xl'
	};

	const titleId = `${uid}-title`;
</script>

<dialog
	bind:this={element}
	oncancel={(event) => {
		if (!dismissible) event.preventDefault();
	}}
	aria-labelledby={titleId}
	{onclose}
	class="border border-border bg-surface text-fg shadow-lg backdrop:bg-overlay {sizes[size]}"
>
	<h2 id={titleId} class="text-lg {size === 'drawer' ? 'pr-12' : ''}">{title}</h2>
	{#if description}<p class="mt-1 text-sm text-fg-muted">{description}</p>{/if}
	<div class="mt-6">
		{@render children()}
	</div>
</dialog>
