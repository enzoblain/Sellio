import { getDb, getClient } from './index';
import { listingStatuses, stocking_places } from './schema';

const db = getDb();
const client = getClient();

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
	.insert(stocking_places)
	.values([{ name: "Appartement d'Enzo" }, { name: 'Maison de Sarah' }])
	.onConflictDoNothing();

await client.end();
