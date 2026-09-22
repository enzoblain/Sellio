import type { RequestHandler } from './$types';

const API_URL = 'http://api:2509';

export const GET: RequestHandler = async ({ params, url }) => {
	return fetch(`${API_URL}/api/${params.path}${url.search}`);
};
