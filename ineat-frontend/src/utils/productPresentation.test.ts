import { describe, expect, it } from 'vitest';
import { getProductImageUrl } from './productPresentation';

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
