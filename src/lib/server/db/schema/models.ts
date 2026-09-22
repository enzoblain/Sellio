import { generate_uuid } from '$lib/server/helpers';
import { brands } from './brands';

import { pgTable, unique, text, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';

export const models = pgTable(
	'models',
	{
		id: uuid('id').default(generate_uuid).primaryKey().notNull(),
		brand_id: uuid('brand_id').references((): AnyPgColumn => brands.id),
		name: text('name').notNull()
	},
	(table) => [unique('brand_and_name').on(table.brand_id, table.name)]
);
