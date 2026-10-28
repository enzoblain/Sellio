import { describe, expect, it } from 'vitest';
import { isActive, navItems } from './nav';

const [dashboard, articles, expenses] = navItems;

describe('navigation', () => {
	it('a 3 sections', () => {
		expect(navItems.map((item) => item.label)).toEqual(['Tableau de bord', 'Articles', 'Dépenses']);
	});

	it.each(['/to-collect', '/stock', '/listed', '/to-ship', '/shipped', '/to-collect/insert'])(
		'Articles est actif sur %s',
		(path) => {
			expect(isActive(articles, path)).toBe(true);
			expect(isActive(dashboard, path)).toBe(false);
			expect(isActive(expenses, path)).toBe(false);
		}
	);

	it('Dashboard et Dépenses ne s’activent que sur leur route', () => {
		expect(isActive(dashboard, '/')).toBe(true);
		expect(isActive(expenses, '/expenses')).toBe(true);
		expect(isActive(articles, '/')).toBe(false);
		expect(isActive(articles, '/stockage')).toBe(false);
	});
});
