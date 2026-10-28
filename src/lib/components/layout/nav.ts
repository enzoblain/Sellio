import type { IconName } from '$lib/components/ui/Icon.svelte';

/** Routes de statut regroupées sous l'entrée « Articles ». */
export const ARTICLE_ROUTES = ['/to-collect', '/stock', '/listed', '/to-ship', '/shipped'] as const;

export const NEW_ARTICLE_HREF = '/to-collect/insert';

export const navItems = [
	{ label: 'Tableau de bord', href: '/', icon: 'dashboard', prefixes: ['/'] },
	{ label: 'Articles', href: '/to-collect', icon: 'articles', prefixes: ARTICLE_ROUTES },
	{ label: 'Dépenses', href: '/expenses', icon: 'expenses', prefixes: ['/expenses'] }
] as const satisfies { label: string; href: string; icon: IconName; prefixes: readonly string[] }[];

export type NavItem = (typeof navItems)[number];

function matches(pathname: string, prefix: string) {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isActive(item: NavItem, pathname: string) {
	// `/` ne correspond qu'à lui-même : sinon il serait actif partout.
	if (item.href === '/') return pathname === '/';
	return item.prefixes.some((prefix) => matches(pathname, prefix));
}
