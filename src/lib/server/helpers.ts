import { sql } from 'drizzle-orm';

export const generate_uuid = sql`uuid_generate_v4()`;
