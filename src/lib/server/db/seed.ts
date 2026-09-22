import { db } from './index';
import { expenseCategories } from './schema/009_expense-categories';
import { listingStatuses } from './schema/008_listing-statuses';

await db
	.insert(listingStatuses)
	.values([
		{ id: 0, name: 'purchased' },
		{ id: 1, name: 'listed' },
		{ id: 2, name: 'to_ship' },
		{ id: 3, name: 'shipped' },
		{ id: 4, name: 'completed' },
		{ id: 5, name: 'returned' }
	])
	.onConflictDoNothing();

await db
	.insert(expenseCategories)
	.values([{ name: 'Packaging' }, { name: 'Transport' }, { name: 'Fournitures' }])
	.onConflictDoNothing();
