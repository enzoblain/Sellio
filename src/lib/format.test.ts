import { describe, expect, it } from 'vitest';
import { euros } from './format';

const normalize = (value: string) => value.replace(/[\u202f\u00a0]/g, ' ');

describe('euros', () => {
	it('formate des centimes en euros', () => {
		expect(normalize(euros(1234))).toBe('12,34 €');
	});
	it('gère zéro', () => {
		expect(normalize(euros(0))).toBe('0,00 €');
	});
	it('gère les montants négatifs', () => {
		expect(normalize(euros(-250))).toBe('-2,50 €');
	});
	it('sépare les milliers', () => {
		expect(normalize(euros(123456789))).toBe('1 234 567,89 €');
	});
});
