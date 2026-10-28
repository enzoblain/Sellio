import { generate_uuid } from '../../helpers';
import { listings } from './007_listings';
import { parcels } from './014_parcels';

import {
	pgTable,
	uuid,
	text,
	bigint,
	integer,
	boolean,
	uniqueIndex,
	check
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const images = pgTable(
	'images',
	{
		id: uuid('id').default(generate_uuid).primaryKey(),
		listing_id: uuid('listing_id').references(() => listings.id, { onDelete: 'cascade' }),
		parcel_id: uuid('parcel_id').references(() => parcels.id, { onDelete: 'cascade' }),
		path: text('path').notNull(),
		mime_type: text('mime_type').notNull(),
		size_bytes: bigint('size_bytes', { mode: 'number' }).notNull(),
		width: integer('width'),
		height: integer('height'),
		is_cover: boolean('is_cover').notNull().default(false),
		position: integer('position').notNull().default(0)
	},
	(table) => [
		uniqueIndex('images_one_cover_per_listing')
			.on(table.listing_id)
			.where(sql`${table.is_cover} = true`),
		check('images_one_owner', sql`num_nonnulls(${table.listing_id}, ${table.parcel_id}) = 1`)
	]
);
