<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		tone = 'neutral',
		children
	}: { tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'; children: Snippet } =
		$props();

	const tones = {
		neutral: 'bg-surface-2 text-fg-muted',
		accent: 'bg-accent/10 text-accent',
		success: 'bg-success/10 text-success',
		warning: 'bg-warning/10 text-warning',
		danger: 'bg-danger/10 text-danger'
	};
</script>

<span class="inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium {tones[tone]}">
	{@render children()}
</span>
