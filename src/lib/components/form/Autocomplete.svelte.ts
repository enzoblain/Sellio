export type AutocompleteItem = {
	uuid: string | null;
	value: string;
};

export function createAutocomplete(
	getQuery: () => (search: string, offset: number, limit: number) => Promise<AutocompleteItem[]>,
	getLimit: () => number,
	getDebounce: () => number,
	setModel?: (model: AutocompleteItem) => void
) {
	let state = $state({
		value: '',
		focused: false,
		items: [] as AutocompleteItem[],
		page: 1,
		loading: false,
		hasmore: true,
		requestid: 0
	});

	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	function getSearchValue() {
		return state.value.trim();
	}

	function onfocus() {
		state.focused = true;
		loadItems(true);
	}

	function oninput() {
		setModel?.({ value: state.value, uuid: null });

		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		const delay = getDebounce();

		if (delay <= 0) {
			loadItems(true);
			return;
		}

		debounceTimer = setTimeout(() => {
			debounceTimer = undefined;
			loadItems(true);
		}, delay);
	}

	function onscroll(event: UIEvent) {
		const element = event.currentTarget as HTMLElement;

		if (element.scrollTop + element.clientHeight >= element.scrollHeight - 10) {
			loadItems();
		}
	}

	function additem() {
		const searchValue = getSearchValue();
		state.focused = false;
		setModel?.({ value: searchValue, uuid: null });
	}

	function selectitem(item: AutocompleteItem) {
		state.value = item.value;
		state.focused = false;
		setModel?.(item);
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
			const newItems = await getQuery()(getSearchValue(), (currentPage - 1) * limit, limit);

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

	return {
		state,
		oninput,
		onfocus,
		onscroll,
		additem,
		selectitem,
		loadItems
	};
}
