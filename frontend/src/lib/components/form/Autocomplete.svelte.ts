import { api } from '$lib/api/client';

export function createAutocomplete(getEndpoint: () => string, getLimit: () => number) {
	let state = $state({
		value: '',
		focused: false,
		items: [] as string[],
		page: 1,
		loading: false,
		hasmore: true,
		requestid: 0
	});

	function getSearchValue() {
		return state.value.trim();
	}

	function onfocus() {
		state.focused = true;
		loadItems(true);
	}

	function oninput() {
		loadItems(true);
	}

	function onscroll(event: UIEvent) {
		const element = event.currentTarget as HTMLElement;

		if (element.scrollTop + element.clientHeight >= element.scrollHeight - 10) {
			loadItems();
		}
	}

	function additem() {
		selectitem(state.value);
	}

	function selectitem(item: string) {
		state.value = item;
		state.focused = false;
	}

	async function loadItems(reset = false) {
		if (state.loading && !reset) return;
		if (!state.hasmore && !reset) return;

		const currentRequest = ++state.requestid;

		if (reset) {
			state.items = [];
			state.page = 1;
			state.hasmore = true;
		}

		state.loading = true;

		const currentPage = state.page;
		const limit = getLimit();

		try {
			const newItems = await getItems(currentPage, limit);

			if (currentRequest !== state.requestid) return;

			if (reset) {
				state.items = newItems;
			} else {
				state.items = [...state.items, ...newItems];
			}

			state.page = currentPage + 1;
			state.hasmore = newItems.length === limit;
		} finally {
			if (currentRequest === state.requestid) {
				state.loading = false;
			}
		}
	}

	async function getItems(page: number, limit: number) {
		const value = getSearchValue();
		const offset = (page - 1) * limit;

		const response = await api
			.get<{ names: string[] }>(getEndpoint())
			.arg('search', value)
			.arg('offset', offset)
			.arg('limit', limit)
			.call();

		return response.names;
	}

	async function existsInDb() {
		const value = getSearchValue();

		if (!value) {
			return false;
		}

		const response = await api.get<{ exists: boolean }>(getEndpoint()).arg('exact', value).call();

		return response.exists;
	}

	return {
		state,
		oninput,
		onfocus,
		onscroll,
		additem,
		selectitem,
		loadItems,
		existsInDb
	};
}
