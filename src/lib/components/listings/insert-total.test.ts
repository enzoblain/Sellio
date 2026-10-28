import { describe, expect, it } from 'vitest';
import { totalCents } from './insert-total';

describe('totalCents', () => {
	it('additionne article et port en centimes sans erreur flottante', () => {
		expect(totalCents(10.1, 0.2)).toBe(1030);
		expect(totalCents(0.1, 0.2)).toBe(30);
	});
	it('traite les champs vides ou négatifs comme 0', () => {
		expect(totalCents(undefined, undefined)).toBe(0);
		expect(totalCents(12, undefined)).toBe(1200);
		expect(totalCents(-5, 3)).toBe(300);
		expect(totalCents(Number.NaN, 3)).toBe(300);
	});
});
