import { generate_uuid } from '../../helpers';
import { garments } from './005_garments';

import { pgTable, uuid, bigint } from 'drizzle-orm/pg-core';

export const listings = pgTable('listings', {
	id: uuid('id').default(generate_uuid).primaryKey(),
	garment_id: uuid('garment_id')
		.notNull()
		.unique()
		.references(() => garments.id),
	purchase_price: bigint('purchase_price', { mode: 'number' }).notNull(),
	shipping_price: bigint('shipping_price', { mode: 'number' }).notNull().default(0),
	listing_price: bigint('listing_price', { mode: 'number' }),
	sale_price: bigint('sale_price', { mode: 'number' })
});
