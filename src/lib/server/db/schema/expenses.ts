import { generate_uuid } from '$lib/server/helpers';
import { expenseObjects } from './expense-objects';

import { bigint, pgTable, uuid } from 'drizzle-orm/pg-core';

export const expenses = pgTable('expenses', {
	id: uuid('id').default(generate_uuid).primaryKey(),
	object_id: uuid('object_id')
		.notNull()
		.references(() => expenseObjects.id),
	price: bigint('price', { mode: 'number' }).notNull()
});
