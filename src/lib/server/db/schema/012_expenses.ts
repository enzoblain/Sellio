import { generate_uuid } from '../../helpers';
import { expenseObjects } from './011_expense-objects';

import { bigint, pgTable, uuid } from 'drizzle-orm/pg-core';

export const expenses = pgTable('expenses', {
	id: uuid('id').default(generate_uuid).primaryKey(),
	object_id: uuid('object_id')
		.notNull()
		.references(() => expenseObjects.id),
	price: bigint('price', { mode: 'number' }).notNull()
});
