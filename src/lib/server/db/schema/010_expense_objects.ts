import { generate_uuid } from '../../helpers';
import { expenseCategories } from './009_expense_categories';

import { pgTable, text, uuid, uniqueIndex } from 'drizzle-orm/pg-core';

export const expenseObjects = pgTable(
	'expense_objects',
	{
		id: uuid('id').default(generate_uuid).primaryKey(),
		category_id: uuid('category_id')
			.notNull()
			.references(() => expenseCategories.id),
		name: text('name').notNull()
	},
	(table) => [uniqueIndex('expense_objects_category_name_unique').on(table.category_id, table.name)]
);
