import { generate_uuid } from '../../helpers';
import { listings } from './007_listings';

import { text, pgTable, smallint, uuid, timestamp } from 'drizzle-orm/pg-core';

export const listingStatuses = pgTable('listing_statuses', {
	id: smallint('id').primaryKey(),
	name: text('name').notNull().unique()
});

export const listingStatusHistory = pgTable('listing_status_history', {
	id: uuid('id').default(generate_uuid).primaryKey(),
	listing_id: uuid('listing_id')
		.notNull()
		.references(() => listings.id, { onDelete: 'cascade' }),
	status: smallint('status')
		.notNull()
		.references(() => listingStatuses.id),
	created_at: timestamp('created_at').notNull().defaultNow()
});
