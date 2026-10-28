export const SIDEBAR_KEY = 'sidebar-collapsed';

/** État de la barre latérale, partagé entre la navigation et la mise en page. */
export const sidebar = $state({ collapsed: false });

/** Relit l'état mémorisé (à appeler une fois monté : inconnu côté serveur). */
export function restoreSidebar() {
	try {
		sidebar.collapsed = localStorage.getItem(SIDEBAR_KEY) === '1';
	} catch {
		// localStorage indisponible : barre dépliée
	}
}

export function toggleSidebar() {
	sidebar.collapsed = !sidebar.collapsed;
	try {
		localStorage.setItem(SIDEBAR_KEY, sidebar.collapsed ? '1' : '0');
	} catch {
		// choix non mémorisé, mais appliqué pour la session
	}
}
