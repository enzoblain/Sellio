import { ApiRequest } from './request';

class ApiClient {
	constructor(private baseUrl = '') {}

	get<T>(endpoint: string) {
		return new ApiRequest<T>('GET', `${this.baseUrl}${endpoint}`);
	}

	post<T>(endpoint: string) {
		return new ApiRequest<T>('POST', `${this.baseUrl}${endpoint}`);
	}

	put<T>(endpoint: string) {
		return new ApiRequest<T>('PUT', `${this.baseUrl}${endpoint}`);
	}

	patch<T>(endpoint: string) {
		return new ApiRequest<T>('PATCH', `${this.baseUrl}${endpoint}`);
	}

	delete<T>(endpoint: string) {
		return new ApiRequest<T>('DELETE', `${this.baseUrl}${endpoint}`);
	}
}

export const api = new ApiClient();
