import { describe, expect, it } from 'vitest';
import { expenseCategories, filterExpenses, totalExpenses } from './expenses';

const items = [
	{ id: 1, name: 'Cartons', category: 'Emballage', price: 1250, date: '2026-10-01' },
	{ id: 2, name: 'Ruban adhésif', category: 'Emballage', price: 399, date: '2026-10-02' },
	{ id: 3, name: 'Abonnement', category: 'Logiciel', price: 2000, date: null }
];

describe('filterExpenses / totalExpenses', () => {
	it('sans filtre, garde tout et totalise tout', () => {
		expect(filterExpenses(items, '', [])).toHaveLength(3);
		expect(totalExpenses(items)).toBe(3649);
	});

	it('filtre par catégorie', () => {
		const result = filterExpenses(items, '', ['Emballage']);
		expect(result.map((i) => i.id)).toEqual([1, 2]);
		expect(totalExpenses(result)).toBe(1649);
	});

	it('cumule plusieurs catégories', () => {
		expect(totalExpenses(filterExpenses(items, '', ['Emballage', 'Logiciel']))).toBe(3649);
	});

	it('recherche sans accents ni casse, sur nom et catégorie', () => {
		expect(filterExpenses(items, 'ADHESIF', []).map((i) => i.id)).toEqual([2]);
		expect(filterExpenses(items, 'logiciel', []).map((i) => i.id)).toEqual([3]);
	});

	it('combine recherche et catégorie', () => {
		const result = filterExpenses(items, 'carton', ['Logiciel']);
		expect(result).toEqual([]);
		expect(totalExpenses(result)).toBe(0);
	});

	it('liste les catégories distinctes triées', () => {
		expect(expenseCategories(items)).toEqual(['Emballage', 'Logiciel']);
	});
});
