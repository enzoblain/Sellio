<script lang="ts">
	let {
		label,
		value,
		align = 'left',
		tone = 'default',
		title
	}: {
		label: string;
		value: string;
		align?: 'left' | 'right';
		tone?: 'default' | 'success' | 'danger';
		title?: string;
	} = $props();

	const tones = { default: 'text-fg', success: 'text-success', danger: 'text-danger' };
</script>

<div class={align === 'right' ? 'text-right' : ''}>
	<p class="text-xs text-fg-muted">{label}</p>
	<p class="font-semibold {tones[tone]}" {title}>{value}</p>
</div>
