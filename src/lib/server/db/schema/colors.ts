import { generate_uuid } from '$lib/server/helpers';

import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const colors = pgTable('colors', {
	id: uuid('id').default(generate_uuid).primaryKey().notNull(),
	name: text('name').notNull().unique()
});
