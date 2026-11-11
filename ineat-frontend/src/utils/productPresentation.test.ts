import { describe, expect, it } from 'vitest';
import { formatNovaScore, getProductImageUrl } from './productPresentation';

describe('getProductImageUrl', () => {
	it('keeps a specific product image', () => {
		expect(
			getProductImageUrl({
				imageUrl: 'https://example.com/mangue.jpg',
				category: { slug: 'fruits-et-legumes' },
			})
		).toBe('https://example.com/mangue.jpg');
	});

	it('uses the generic image for fresh product categories', () => {
		expect(getProductImageUrl({ category: { slug: 'fruits-et-legumes' } })).toBe(
			'/images/categories/fruits-et-legumes.svg'
		);
		expect(getProductImageUrl({ category: { slug: 'viandes-et-poissons' } })).toBe(
			'/images/categories/viandes-et-poissons.svg'
		);
	});
});

describe('formatNovaScore', () => {
	it.each([
		['GROUP_1', '1 - Aliments non transformés ou transformés minimalement'],
		['GROUP_2', '2 - Ingrédients culinaires transformés'],
		['GROUP_3', '3 - Aliments transformés'],
		['GROUP_4', '4 - Produits alimentaires ultra-transformés'],
	])('remplace la valeur technique %s par un libellé utilisateur', (score, label) => {
		expect(formatNovaScore(score)).toBe(label);
	});

	it('gère une valeur absente', () => {
		expect(formatNovaScore()).toBe('Information non disponible');
	});
});
