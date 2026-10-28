import { generate_uuid } from '../../helpers';
import { carriers } from './013_carriers';

import { date, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const parcels = pgTable('parcels', {
	id: uuid('id').default(generate_uuid).primaryKey(),
	carrier_id: smallint('carrier_id')
		.notNull()
		.references(() => carriers.id),
	pickup_point: text('pickup_point'),
	pickup_deadline: date('pickup_deadline'),
	tracking_code: text('tracking_code'),
	created_at: timestamp('created_at').notNull().defaultNow(),
	collected_at: timestamp('collected_at')
});
