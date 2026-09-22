import { generate_uuid } from '../../helpers';
import { models } from './003_models';
import { sizes } from './004_sizes';
import { colors } from './002_colors';

import { pgTable, uuid } from 'drizzle-orm/pg-core';

export const garments = pgTable('garments', {
	id: uuid('id').default(generate_uuid).primaryKey().notNull(),
	model_id: uuid('model_id')
		.notNull()
		.references(() => models.id),
	size_id: uuid('size_id')
		.notNull()
		.references(() => sizes.id),
	color_id: uuid('color_id')
		.notNull()
		.references(() => colors.id)
});
