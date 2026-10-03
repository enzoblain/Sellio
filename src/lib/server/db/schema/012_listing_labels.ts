import { generate_label_code, generate_uuid } from '../../helpers';
import { listings } from './007_listings';

import { boolean, char, pgTable, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const listingLabels = pgTable(
	'listing_labels',
	{
		id: uuid('id').default(generate_uuid).primaryKey(),
		listing_id: uuid('listing_id')
			.notNull()
			.references(() => listings.id, { onDelete: 'cascade' }),
		code: char('code', { length: 4 }).notNull().$defaultFn(generate_label_code),
		is_used: boolean('is_used').notNull().default(false)
	},
	(table) => [
		uniqueIndex('listing_labels_code_available_unique')
			.on(table.code)
			.where(sql`${table.is_used} = false`)
	]
);
