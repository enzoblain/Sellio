import { describe, expect, it } from 'vitest';
import { deadlineState, filterByCarrier, sortParcels, type Parcel } from './parcels';

const parcel = (id: string, extra: Partial<Parcel> = {}): Parcel => ({
	id,
	carrierId: 1,
	carrier: 'Colissimo',
	pickupPoint: null,
	pickupDeadline: null,
	trackingCode: null,
	createdAt: new Date('2026-10-01T10:00:00'),
	collectedAt: null,
	photos: [],
	...extra
});

const now = new Date('2026-10-28T15:00:00');

describe('deadlineState', () => {
	it('ne dit rien sans date limite', () => {
		expect(deadlineState(null, now)).toBeNull();
	});
	it('alerte quand la date est dépassée ou proche', () => {
		expect(deadlineState('2026-10-27', now)).toEqual({
			tone: 'danger',
			label: 'Date limite dépassée'
		});
		expect(deadlineState('2026-10-28', now)?.tone).toBe('danger');
		expect(deadlineState('2026-10-29', now)).toEqual({ tone: 'warning', label: 'Plus que 1 jour' });
		expect(deadlineState('2026-10-31', now)).toEqual({
			tone: 'warning',
			label: 'Plus que 3 jours'
		});
	});
	it('reste neutre quand la date est lointaine', () => {
		expect(deadlineState('2026-11-15', now)?.tone).toBe('neutral');
	});
});

describe('filtre et tri', () => {
	const list = [
		parcel('a', { pickupDeadline: '2026-11-10', carrierId: 1 }),
		parcel('b', { pickupDeadline: null, carrierId: 2, carrier: 'Mondial Relay' }),
		parcel('c', { pickupDeadline: '2026-10-30', carrierId: 2, carrier: 'Mondial Relay' }),
		parcel('d', { pickupDeadline: null, createdAt: new Date('2026-10-20T10:00:00') })
	];
	it('filtre par transporteur', () => {
		expect(filterByCarrier(list, [2]).map((p) => p.id)).toEqual(['b', 'c']);
		expect(filterByCarrier(list, [])).toHaveLength(4);
	});
	it('trie par date limite, sans date en dernier', () => {
		expect(sortParcels(list, 'deadline').map((p) => p.id)).toEqual(['c', 'a', 'd', 'b']);
	});
	it('trie par ajout récent', () => {
		expect(sortParcels(list, 'recent')[0].id).toBe('d');
	});
});
