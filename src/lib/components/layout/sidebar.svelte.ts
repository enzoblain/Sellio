export const SIDEBAR_KEY = 'sidebar-collapsed';

/** État de la barre latérale, partagé entre la navigation et la mise en page. */
export const sidebar = $state({ collapsed: false });

/** Les largeurs se basent sur `data-sidebar` (posé avant le premier rendu par app.html). */
function apply() {
	if (sidebar.collapsed) document.documentElement.dataset.sidebar = 'collapsed';
	else delete document.documentElement.dataset.sidebar;
}

/** Se synchronise avec l'état mémorisé (à appeler une fois monté : inconnu côté serveur). */
export function restoreSidebar() {
	try {
		sidebar.collapsed = localStorage.getItem(SIDEBAR_KEY) === '1';
	} catch {
		// localStorage indisponible : barre dépliée
	}
	apply();
}

export function toggleSidebar() {
	sidebar.collapsed = !sidebar.collapsed;
	apply();
	try {
		localStorage.setItem(SIDEBAR_KEY, sidebar.collapsed ? '1' : '0');
	} catch {
		// choix non mémorisé, mais appliqué pour la session
	}
}
