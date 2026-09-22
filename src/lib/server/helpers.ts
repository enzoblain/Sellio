import { sql } from 'drizzle-orm';

export const generate_uuid = sql`gen_random_uuid()`;

export const generate_label_code = () =>
	Math.floor(Math.random() * 0x10000)
		.toString(16)
		.toUpperCase()
		.padStart(4, '0');
