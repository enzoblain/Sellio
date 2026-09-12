import type { HttpMethod } from './types';

export class ApiRequest<T> {
	private params = new URLSearchParams();
	private payload?: unknown;

	constructor(
		private method: HttpMethod,
		private endpoint: string
	) {}

	arg(key: string, value: string | number | boolean | undefined | null) {
		if (value !== undefined && value !== null && value !== '') {
			this.params.set(key, String(value));
		}

		return this;
	}

	body(payload: unknown) {
		this.payload = payload;

		return this;
	}

	async call(): Promise<T> {
		const query = this.params.toString();
		const url = query ? `${this.endpoint}?${query}` : this.endpoint;

		const response = await fetch(url, {
			method: this.method,
			headers: {
				'Content-Type': 'application/json'
			},
			body: this.payload !== undefined ? JSON.stringify(this.payload) : undefined
		});

		if (!response.ok) {
			throw new Error(`API error ${response.status}: ${response.statusText}`);
		}

		return response.json() as Promise<T>;
	}
}
