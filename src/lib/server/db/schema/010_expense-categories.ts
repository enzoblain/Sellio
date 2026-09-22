import { generate_uuid } from '../../helpers';
import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const expenseCategories = pgTable('expense_categories', {
	id: uuid('id').default(generate_uuid).primaryKey(),
	name: text('name').notNull().unique()
});
