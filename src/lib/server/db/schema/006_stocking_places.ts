import { generate_uuid } from '../../helpers';

import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const stocking_places = pgTable('stocking_places', {
	id: uuid('id').default(generate_uuid).primaryKey().notNull(),
	name: text('name').notNull().unique()
});
