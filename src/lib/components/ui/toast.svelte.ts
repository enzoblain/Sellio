export type ToastTone = 'success' | 'danger' | 'info';

export type ToastItem = { id: number; message: string; tone: ToastTone };

/** Durée d'affichage par défaut (ms). */
export const TOAST_DURATION = 4000;

export const toasts = $state<{ items: ToastItem[] }>({ items: [] });

let nextId = 1;

export function dismissToast(id: number) {
	toasts.items = toasts.items.filter((item) => item.id !== id);
}

/** Affiche une confirmation brève ; disparaît seule après `duration` ms (0 = reste). */
export function toast(message: string, tone: ToastTone = 'success', duration = TOAST_DURATION) {
	const id = nextId++;
	toasts.items = [...toasts.items, { id, message, tone }];
	if (duration > 0) setTimeout(() => dismissToast(id), duration);
	return id;
}
