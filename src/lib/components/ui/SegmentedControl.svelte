<script lang="ts">
	let {
		options,
		value = $bindable(options[0]?.value ?? ''),
		label
	}: {
		options: { value: string; label: string }[];
		value?: string;
		label: string;
	} = $props();

	const name = $props.id();
</script>

<div
	role="radiogroup"
	aria-label={label}
	class="inline-flex gap-0.5 rounded-md border border-border bg-surface-2 p-0.5"
>
	{#each options as option (option.value)}
		<label
			class="flex min-h-11 cursor-pointer items-center rounded-sm px-4 text-sm font-medium transition-colors has-[:checked]:bg-surface has-[:checked]:text-fg has-[:checked]:shadow-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring md:min-h-8 {value ===
			option.value
				? 'text-fg'
				: 'text-fg-muted hover:text-fg'}"
		>
			<input type="radio" {name} value={option.value} bind:group={value} class="sr-only" />
			{option.label}
		</label>
	{/each}
</div>
