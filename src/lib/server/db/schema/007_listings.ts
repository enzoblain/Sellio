import { generate_uuid } from '../../helpers';
import { models } from './003_models';
import { sizes } from './004_sizes';
import { colors } from './002_colors';
import { stocking_places } from './006_stocking_places';

import { pgTable, uuid, bigint } from 'drizzle-orm/pg-core';

export const listings = pgTable('listings', {
	id: uuid('id').default(generate_uuid).primaryKey(),
	model_id: uuid('model_id')
		.notNull()
		.references(() => models.id),
	size_id: uuid('size_id')
		.notNull()
		.references(() => sizes.id),
	color_id: uuid('color_id')
		.notNull()
		.references(() => colors.id),
	purchase_price: bigint('purchase_price', { mode: 'number' }).notNull(),
	shipping_price: bigint('shipping_price', { mode: 'number' }).notNull().default(0),
	listing_price: bigint('listing_price', { mode: 'number' }),
	sale_price: bigint('sale_price', { mode: 'number' }),
	stocking_place_id: uuid('stocking_place_id').references(() => stocking_places.id)
});
