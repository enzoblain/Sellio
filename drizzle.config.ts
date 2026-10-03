import { defineConfig } from 'drizzle-kit';

// Generation only reads the schema; the database URL is required when migrating.
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
	schema: './src/lib/server/db/schema',
	dialect: 'postgresql',
	...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
	verbose: true,
	strict: true
});
