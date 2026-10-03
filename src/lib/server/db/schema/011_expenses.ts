import { generate_uuid } from '../../helpers';
import { expenseObjects } from './010_expense_objects';

import { bigint, pgTable, uuid, timestamp } from 'drizzle-orm/pg-core';

export const expenses = pgTable('expenses', {
	id: uuid('id').default(generate_uuid).primaryKey(),
	object_id: uuid('object_id')
		.notNull()
		.references(() => expenseObjects.id),
	price: bigint('price', { mode: 'number' }).notNull(),
	created_at: timestamp('created_at').notNull().defaultNow()
});
