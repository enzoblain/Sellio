import { sql } from 'drizzle-orm';

export const generate_uuid = sql`gen_random_uuid()`;
