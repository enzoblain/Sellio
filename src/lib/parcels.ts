export type Parcel = {
	id: string;
	carrierId: number;
	carrier: string;
	pickupPoint: string | null;
	pickupDeadline: string | null;
	trackingCode: string | null;
	createdAt: Date;
	collectedAt: Date | null;
	photos: { id: string; path: string }[];
};

export type ParcelSort = 'deadline' | 'recent';

export const parcelSortOptions = [
	{ value: 'deadline', label: 'Date limite' },
	{ value: 'recent', label: 'Ajout récent' }
] as const satisfies { value: ParcelSort; label: string }[];

/** Nombre de jours avant la date limite à partir duquel on alerte. */
export const DEADLINE_SOON_DAYS = 3;

const DAY = 86_400_000;

/** Jours entiers entre `now` (jour local) et la date limite `YYYY-MM-DD` ; négatif si dépassée. */
export function daysUntil(deadline: string, now: Date) {
	const [year, month, day] = deadline.split('-').map(Number);
	const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
	return Math.round((Date.UTC(year, month - 1, day) - today) / DAY);
}

export type DeadlineState = { tone: 'danger' | 'warning' | 'neutral'; label: string };

export function deadlineState(deadline: string | null, now = new Date()): DeadlineState | null {
	if (!deadline) return null;
	const days = daysUntil(deadline, now);
	if (days < 0) return { tone: 'danger', label: 'Date limite dépassée' };
	if (days === 0) return { tone: 'danger', label: 'Dernier jour' };
	if (days <= DEADLINE_SOON_DAYS)
		return { tone: 'warning', label: `Plus que ${days} jour${days > 1 ? 's' : ''}` };
	return { tone: 'neutral', label: '' };
}

export function filterByCarrier(parcels: Parcel[], carrierIds: number[]) {
	return carrierIds.length ? parcels.filter((p) => carrierIds.includes(p.carrierId)) : parcels;
}

const time = (value: Date | string) => new Date(value).getTime();

/** « Date limite » : les plus urgents d'abord, sans date en dernier (puis par ajout). */
export function sortParcels(parcels: Parcel[], sort: ParcelSort) {
	return [...parcels].sort((a, b) => {
		if (sort === 'deadline') {
			if (a.pickupDeadline !== b.pickupDeadline) {
				if (!a.pickupDeadline) return 1;
				if (!b.pickupDeadline) return -1;
				return a.pickupDeadline < b.pickupDeadline ? -1 : 1;
			}
		}
		return time(b.createdAt) - time(a.createdAt);
	});
}

export const formatParcelDate = (value: Date | string) =>
	new Intl.DateTimeFormat('fr-FR').format(new Date(value));

export const formatDeadline = (value: string) =>
	new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
