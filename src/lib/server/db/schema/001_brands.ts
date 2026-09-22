import { generate_uuid } from '../../helpers';

import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const brands = pgTable('brands', {
	id: uuid('id').default(generate_uuid).primaryKey().notNull(),
	name: text('name').notNull().unique()
});
