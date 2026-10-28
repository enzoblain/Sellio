<script lang="ts">
	import Chip from './Chip.svelte';

	let {
		options,
		selected = $bindable([]),
		label
	}: {
		options: { value: string; label: string }[];
		selected?: string[];
		label: string;
	} = $props();

	function toggle(value: string) {
		selected = selected.includes(value)
			? selected.filter((item) => item !== value)
			: [...selected, value];
	}
</script>

<div role="group" aria-label={label} class="flex flex-wrap gap-2">
	{#each options as option (option.value)}
		<Chip selected={selected.includes(option.value)} onclick={() => toggle(option.value)}>
			{option.label}
		</Chip>
	{/each}
</div>
