import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

let client: ReturnType<typeof postgres> | undefined;

export function getClient() {
	if (!client) {
		client = postgres(process.env.DATABASE_URL!);
	}

	return client;
}

export function getDb() {
	return drizzle(getClient());
}
