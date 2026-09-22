<script lang="ts">
	import Autocomplete from '$lib/components/form/Autocomplete.svelte';
</script>

<Autocomplete endpoint="/api/v1/names/brands" limit={5} />
