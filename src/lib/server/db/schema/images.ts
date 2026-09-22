import { generate_uuid } from '$lib/server/helpers';
import { garments } from './garments';

import { pgTable, uuid, text, bigint, integer, boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const images = pgTable(
	'images',
	{
		id: uuid('id').default(generate_uuid).primaryKey(),
		garment_id: uuid('garment_id')
			.notNull()
			.references(() => garments.id, { onDelete: 'cascade' }),
		path: text('path').notNull(),
		mime_type: text('mime_type').notNull(),
		size_bytes: bigint('size_bytes', { mode: 'number' }).notNull(),
		width: integer('width'),
		height: integer('height'),
		is_cover: boolean('is_cover').notNull().default(false)
	},
	(table) => [
		uniqueIndex('images_one_cover_per_garment')
			.on(table.garment_id)
			.where(sql`${table.is_cover} = true`)
	]
);
