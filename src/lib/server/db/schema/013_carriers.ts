import { pgTable, smallint, text } from 'drizzle-orm/pg-core';

export const carriers = pgTable('carriers', {
	id: smallint('id').primaryKey(),
	name: text('name').notNull().unique()
});
